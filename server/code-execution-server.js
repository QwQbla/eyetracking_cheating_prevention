// server/code-execution-server.js
/* eslint-env node */
/* eslint-disable no-unused-vars */

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// --- 基础配置 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);
const app = express();
// eslint-disable-next-line no-undef
const PORT = process.env.CODE_EXECUTION_PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 安全配置
const EXECUTION_CONFIG = {
  timeout: 10000,       // 10秒超时
  maxMemory: '128m',    // 最大内存 128MB
  maxOutputLength: 10000, // 最大输出长度 10KB
  allowedLanguages: ['python', 'java', 'cpp', 'javascript'],
};

// --- 语言配置 (核心修复部分) ---
// 逻辑说明：
// 1. 源代码挂载在 /workspace (只读，:ro)
// 2. 编译产物输出到 /tmp (Linux容器默认可写)
const LANGUAGE_CONFIG = {
  python: {
    extension: '.py',
    dockerImage: 'python:3.11-slim',
    // Python 不需要编译，直接运行
    getDockerCommand: (fileName, timeout) => 
      `timeout ${timeout} python3 /workspace/${fileName}`
  },
  java: {
    extension: '.java',
    dockerImage: 'openjdk:17-jdk-slim',
    // Java: 编译到 /tmp，然后从 /tmp 运行
    getDockerCommand: (fileName, timeout) => {
      const className = fileName.replace('.java', '');
      // javac -d /tmp : 指定输出目录为 /tmp
      // -cp /tmp : 指定 classpath 为 /tmp
      return `bash -c "javac -d /tmp /workspace/${fileName} && timeout ${timeout} java -cp /tmp ${className}"`;
    }
  },
  cpp: {
    extension: '.cpp',
    dockerImage: 'gcc:latest',
    // C++: 编译输出到 /tmp/code，然后运行
    getDockerCommand: (fileName, timeout) => 
      `bash -c "g++ -o /tmp/code /workspace/${fileName} && timeout ${timeout} /tmp/code"`
  },
};

// --- 工具函数 ---

/**
 * 提取 Java 类名
 */
function extractJavaClassName(code) {
  const classMatch = code.match(/public\s+class\s+(\w+)/);
  return classMatch ? classMatch[1] : 'Main';
}

/**
 * 验证代码安全性
 */
function validateCodeSafety(code, language) {
  const dangerousPatterns = [
    /import\s+os|import\s+sys|import\s+subprocess/,
    /Runtime\.getRuntime|ProcessBuilder/,
    /system\(|exec\(|popen\(/,
    /eval\(|Function\(/,
    /require\(['"]child_process|require\(['"]fs/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { safe: false, reason: '代码包含禁止的系统操作' };
    }
  }
  if (code.length > 50000) return { safe: false, reason: '代码长度超过限制' };
  return { safe: true };
}

/**
 * 服务器启动时的镜像预加载 (防止第一次运行卡顿)
 */
async function preloadImages() {
  console.log('📦正在检查 Docker 环境...');
  const images = Object.values(LANGUAGE_CONFIG).map(c => c.dockerImage).filter(Boolean);
  
  for (const img of images) {
    try {
      // 检查镜像是否存在，不存在则在后台拉取
      await execAsync(`docker inspect ${img} > /dev/null 2>&1 || docker pull ${img}`);
    } catch (e) {
      console.warn(`⚠️ 警告: 镜像 ${img} 拉取失败，首次运行时可能会慢。`);
    }
  }
  console.log('✅ Docker 环境检查完毕');
}

// --- 核心执行逻辑 ---

/**
 * 使用 Docker 执行代码 (修复版)
 */
async function executeWithDocker(code, language, stdin = '') {
  const langConfig = LANGUAGE_CONFIG[language];
  if (!langConfig) throw new Error(`不支持的语言: ${language}`);

  // 创建宿主机临时目录
  const tempDir = path.join(__dirname, 'temp', `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // 1. 准备文件
    let fileName = `code${langConfig.extension}`;
    if (language === 'java') {
      fileName = `${extractJavaClassName(code)}${langConfig.extension}`;
    }
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, code, 'utf-8');

    // 2. 构建 Docker 命令
    const timeoutSeconds = Math.ceil(EXECUTION_CONFIG.timeout / 1000);
    const runInternalCmd = langConfig.getDockerCommand(fileName, timeoutSeconds);

    const dockerArgs = [
      'run',
      '--rm',                             // 运行完立即删除容器
      `--memory=${EXECUTION_CONFIG.maxMemory}`, // 内存限制
      '--network=none',                   // 彻底断网
      `-v "${tempDir}:/workspace:ro"`,    // 核心修改: 只读挂载代码目录
      langConfig.dockerImage,             // 镜像名
      runInternalCmd                      // 容器内执行的命令
    ];

    // 3. 执行
    // console.log(`[Docker] Executing: docker ${dockerArgs.join(' ')}`); // 调试用
    const { stdout, stderr } = await execAsync(`docker ${dockerArgs.join(' ')}`, {
      timeout: EXECUTION_CONFIG.timeout + 5000, 
      maxBuffer: EXECUTION_CONFIG.maxOutputLength * 2,
    });

    // 4. 清洗输出 (去除 Docker 拉取镜像的日志)
    let cleanStderr = stderr || '';
    if (cleanStderr.includes('Unable to find image') || cleanStderr.includes('Pulling from')) {
        cleanStderr = ''; // 或者仅保留最后几行真实的报错
    }

    // 5. 截断过长的输出
    const output = stdout.length > EXECUTION_CONFIG.maxOutputLength 
      ? stdout.substring(0, EXECUTION_CONFIG.maxOutputLength) + '\n... (输出已截断)'
      : stdout;

    return {
      stdout: output,
      stderr: cleanStderr,
      exitCode: 0,
      executionTime: 0, // Docker 内较难精确统计 CPU 时间
    };

  } catch (error) {
    // 处理执行错误 (编译失败或运行时崩溃)
    const errorMessage = error.stderr || error.message;
    return {
      stdout: error.stdout || '', // 某些编译器错误可能在 stdout
      stderr: errorMessage.length > EXECUTION_CONFIG.maxOutputLength
        ? errorMessage.substring(0, EXECUTION_CONFIG.maxOutputLength) + '\n... (错误信息已截断)'
        : errorMessage,
      exitCode: error.code || 1,
      executionTime: 0,
    };
  } finally {
    // 清理宿主机临时文件
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) { console.error('临时文件清理失败:', e.message); }
  }
}

/**
 * 本地执行回退方案 (仅保留，防止 Docker 不可用时服务彻底挂掉)
 */
async function executeLocally(code, language) {
    // ... 此处为了代码简洁，保留你原有的 executeLocally 逻辑即可 ...
    // 如果需要我也完整写出来，可以告诉我，不过建议主要用 Docker
    return { stdout: "", stderr: "Docker 未启动，本地执行模式暂未完全适配编译型语言的安全路径。", exitCode: 1, executionTime: 0 };
}

// --- API 路由 ---

app.post('/api/execute', async (req, res) => {
  try {
    const { code, language = 'javascript', stdin = '' } = req.body;

    if (!code) return res.status(400).json({ success: false, error: '代码不能为空' });
    if (!EXECUTION_CONFIG.allowedLanguages.includes(language)) {
      return res.status(400).json({ success: false, error: `不支持的语言: ${language}` });
    }

    // JS 前端执行
    if (language === 'javascript') {
      return res.status(400).json({ success: false, error: 'JavaScript 应在浏览器沙箱执行' });
    }

    // 检查 Docker 可用性
    let result;
    try {
      await execAsync('docker -v');
      result = await executeWithDocker(code, language, stdin);
    } catch (e) {
      console.warn('Docker 不可用:', e.message);
      // 如果 Docker 挂了，回退到本地 (或者直接报错)
      result = await executeLocally(code, language); 
    }

    res.json({
      success: true,
      result: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误: ' + error.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.get('/api/docker-status', async (req, res) => {
  try {
    const { stdout } = await execAsync('docker --version');
    res.json({ dockerAvailable: true, version: stdout.trim() });
  } catch (e) {
    res.json({ dockerAvailable: false, error: e.message });
  }
});

// --- 启动 ---
app.listen(PORT, async () => {
  console.log(`🚀 代码执行服务器运行在端口 ${PORT}`);
  await preloadImages(); // 启动时预热环境
});