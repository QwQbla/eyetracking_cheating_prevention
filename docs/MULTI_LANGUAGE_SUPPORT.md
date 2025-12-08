# 多语言支持说明文档

## 概述

本面试平台现已支持多种编程语言的语法高亮和编辑器功能。当前支持的语言包括：

- **JavaScript** - 完全支持（包含语法高亮和代码执行）
- **Python** - 支持语法高亮（代码执行需要后端服务）
- **Java** - 支持语法高亮（代码执行需要后端服务）
- **C++** - 支持语法高亮（代码执行需要后端服务）

## 功能特性

### 1. 语法高亮
所有支持的语言都具备完整的语法高亮功能，使用 CodeMirror 编辑器实现。

### 2. 语言选择器
- 面试官可以自由选择编程语言
- 面试者可以看到当前使用的语言（只读）
- 语言选择会通过 Socket.IO 实时同步

### 3. 代码同步
- 代码内容和语言选择都会在面试官和面试者之间实时同步
- 使用 Socket.IO 进行双向通信

## 当前限制

### 代码执行
- **JavaScript**: 可以在浏览器中直接执行（使用 Web Worker）
- **其他语言**: 需要在浏览器中执行，需要配置后端代码执行服务

## 扩展后端代码执行服务

要支持 Python、Java、C++ 等语言的代码执行，需要搭建后端服务。以下是实现方案：

### 方案 1: 使用在线编译器 API

集成现有的在线编译器服务，如：
- **JDoodle API**: 支持 60+ 种编程语言
- **Judge0 API**: 开源的在线代码执行平台
- **Repl.it API**: 在线编程环境

### 方案 2: 自建后端服务

搭建自己的代码执行服务，使用 Docker 容器来隔离执行环境：

```javascript
// 示例：后端代码执行服务接口
POST /api/execute
Body: {
  code: "print('Hello, World!')",
  language: "python",
  stdin: ""
}
Response: {
  stdout: "Hello, World!\n",
  stderr: "",
  exitCode: 0,
  executionTime: 123
}
```

### 实现步骤

1. **修改前端代码执行逻辑**

   在 `src/pages/IntervieweeContent.jsx` 和 `src/pages/InterviewerContent.jsx` 中，修改 `runCode` 函数：

```javascript
const runCode = async () => {
  setExecutionResult('正在执行代码...');
  
  if (language === 'javascript') {
    // JavaScript 使用本地 Worker 执行
    workerRef.current?.postMessage({ code, language });
  } else {
    // 其他语言调用后端 API
    try {
      const response = await fetch(API_ENDPOINTS.executeCode, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });
      const result = await response.json();
      setExecutionResult(JSON.stringify(result, null, 2));
      
      // 同步执行结果给面试官
      if (socketRef.current) {
        socketRef.current.emit('code-result', result);
      }
    } catch (error) {
      setExecutionResult(`执行错误: ${error.message}`);
    }
  }
};
```

2. **添加 API 端点配置**

   在 `src/api/index.js` 中添加代码执行端点：

```javascript
export const API_ENDPOINTS = {
  // ... 现有端点
  executeCode: 'http://your-backend/api/execute',
};
```

3. **更新 Worker 文件**

   `public/coderunner.js` 已更新，会自动检测非 JavaScript 语言并提示需要后端服务。

## 添加新语言支持

要添加新的编程语言支持：

### 1. 安装语言包

```bash
npm install @codemirror/lang-<language>
```

### 2. 更新语言配置

在 `src/config/languages.js` 中添加新语言：

```javascript
import { <language> } from '@codemirror/lang-<language>';

export const LANGUAGE_CONFIG = {
  // ... 现有配置
  <language>: {
    name: '<Language Name>',
    extension: <language>(),
    defaultCode: '// 默认代码模板\n',
    runner: '<language>',
  },
};
```

### 3. 语言选择器会自动更新

由于语言选择器使用 `SUPPORTED_LANGUAGES` 动态生成选项，新语言会自动出现在下拉菜单中。

## 安全考虑

⚠️ **重要**: 代码执行服务必须实现以下安全措施：

1. **资源限制**: 限制内存、CPU 时间和执行时间
2. **沙箱隔离**: 使用 Docker 或类似容器技术隔离执行环境
3. **输入验证**: 验证和过滤用户输入的代码
4. **超时控制**: 设置合理的执行超时时间
5. **日志记录**: 记录所有代码执行请求和结果

## 文件结构

```
src/
├── components/
│   ├── SharedCodeEditor.jsx      # 代码编辑器组件（支持多语言）
│   └── LanguageSelector.jsx      # 语言选择器组件
├── config/
│   └── languages.js              # 语言配置定义
└── pages/
    ├── IntervieweeContent.jsx    # 面试者页面（接收语言同步）
    └── InterviewerContent.jsx    # 面试官页面（控制语言选择）

public/
└── coderunner.js                 # 代码执行 Worker（支持多语言架构）

server/
└── signaling-server.js           # Socket.IO 服务器（已支持语言同步事件）
```

## 总结

当前实现提供了完整的多语言编辑和语法高亮支持，代码执行部分需要根据实际需求配置后端服务。系统架构已准备好支持多语言代码执行，只需集成相应的后端 API 即可。

