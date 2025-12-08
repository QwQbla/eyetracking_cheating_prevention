// server/code-execution-api.js
// 使用在线编译器 API 的代码执行服务（备选方案）

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.CODE_EXECUTION_PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 在线编译器 API 配置（示例：使用 JDoodle API）
// 注意：需要注册账号获取 Client ID 和 Client Secret
const API_CONFIG = {
  // JDoodle API 配置（需要注册：https://www.jdoodle.com/compiler-api）
  jdoodle: {
    endpoint: 'https://api.jdoodle.com/v1/execute',
    clientId: process.env.JDOODLE_CLIENT_ID || '',
    clientSecret: process.env.JDOODLE_CLIENT_SECRET || '',
    versionIndex: {
      python: 3,
      java: 4,
      cpp: 5,
      c: 5,
    },
  },
  
  // Judge0 API 配置（开源方案，需要自建服务器）
  judge0: {
    endpoint: process.env.JUDGE0_ENDPOINT || 'https://judge0-ce.p.rapidapi.com',
    apiKey: process.env.JUDGE0_API_KEY || '',
    languageIds: {
      python: 71, // Python 3
      java: 62,   // Java
      cpp: 54,    // C++17
      c: 50,      // C
    },
  },
};

/**
 * 语言到编译器语言 ID 的映射
 */
const LANGUAGE_MAP = {
  python: { name: 'python3', versionIndex: 3 },
  java: { name: 'java', versionIndex: 4 },
  cpp: { name: 'cpp', versionIndex: 5 },
  c: { name: 'c', versionIndex: 5 },
};

/**
 * 使用 JDoodle API 执行代码
 */
async function executeWithJDoodle(code, language, stdin = '') {
  const langInfo = LANGUAGE_MAP[language];
  if (!langInfo) {
    throw new Error(`不支持的语言: ${language}`);
  }

  if (!API_CONFIG.jdoodle.clientId || !API_CONFIG.jdoodle.clientSecret) {
    throw new Error('JDoodle API 凭证未配置，请设置环境变量 JDOODLE_CLIENT_ID 和 JDOODLE_CLIENT_SECRET');
  }

  const response = await fetch(API_CONFIG.jdoodle.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: API_CONFIG.jdoodle.clientId,
      clientSecret: API_CONFIG.jdoodle.clientSecret,
      script: code,
      language: langInfo.name,
      versionIndex: langInfo.versionIndex,
      stdin: stdin,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '执行失败');
  }

  return {
    stdout: data.output || '',
    stderr: data.error || '',
    exitCode: data.statusCode === '200' ? 0 : 1,
    executionTime: data.cpuTime || 0,
    memory: data.memory || 0,
  };
}

/**
 * 使用 Judge0 API 执行代码
 */
async function executeWithJudge0(code, language, stdin = '') {
  const languageId = API_CONFIG.judge0.languageIds[language];
  if (!languageId) {
    throw new Error(`不支持的语言: ${language}`);
  }

  if (!API_CONFIG.judge0.apiKey) {
    throw new Error('Judge0 API Key 未配置，请设置环境变量 JUDGE0_API_KEY');
  }

  // 提交代码
  const submitResponse = await fetch(`${API_CONFIG.judge0.endpoint}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': API_CONFIG.judge0.apiKey,
      'X-RapidAPI-Host': new URL(API_CONFIG.judge0.endpoint).hostname,
    },
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      stdin: stdin,
    }),
  });

  const submission = await submitResponse.json();
  const token = submission.token;

  // 轮询获取结果
  let result = null;
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒

    const resultResponse = await fetch(`${API_CONFIG.judge0.endpoint}/submissions/${token}`, {
      headers: {
        'X-RapidAPI-Key': API_CONFIG.judge0.apiKey,
        'X-RapidAPI-Host': new URL(API_CONFIG.judge0.endpoint).hostname,
      },
    });

    result = await resultResponse.json();

    if (result.status && result.status.id > 2) {
      // 状态 ID > 2 表示已完成
      break;
    }

    attempts++;
  }

  if (!result) {
    throw new Error('获取执行结果超时');
  }

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    compile_output: result.compile_output || '',
    exitCode: result.status.id === 3 ? 0 : 1, // 3 = Accepted
    executionTime: result.time || 0,
    memory: result.memory || 0,
  };
}

/**
 * 代码执行 API 端点
 */
app.post('/api/execute', async (req, res) => {
  try {
    const { code, language = 'javascript', stdin = '', apiProvider = 'jdoodle' } = req.body;

    // 验证输入
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: '代码不能为空',
      });
    }

    if (language === 'javascript') {
      return res.status(400).json({
        success: false,
        error: 'JavaScript 代码应在浏览器中执行',
      });
    }

    let result;

    try {
      if (apiProvider === 'judge0') {
        result = await executeWithJudge0(code, language, stdin);
      } else {
        result = await executeWithJDoodle(code, language, stdin);
      }

      res.json({
        success: true,
        result: {
          stdout: result.stdout,
          stderr: result.stderr || result.compile_output || '',
          exitCode: result.exitCode,
          executionTime: result.executionTime,
          memory: result.memory,
        },
      });
    } catch (apiError) {
      console.error('API 执行错误:', apiError);
      res.status(500).json({
        success: false,
        error: `代码执行失败: ${apiError.message}`,
      });
    }

  } catch (error) {
    console.error('代码执行错误:', error);
    res.status(500).json({
      success: false,
      error: '代码执行失败: ' + error.message,
    });
  }
});

/**
 * 健康检查端点
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiProviders: {
      jdoodle: !!API_CONFIG.jdoodle.clientId,
      judge0: !!API_CONFIG.judge0.apiKey,
    },
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`代码执行 API 服务器已启动在端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
  console.log('注意：需要配置 API 凭证才能使用在线编译器服务');
});

