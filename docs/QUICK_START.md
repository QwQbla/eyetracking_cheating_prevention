# 代码执行服务快速开始

## 🚀 快速启动（3 步）

### 步骤 1: 确保 Docker 已安装

```bash
docker --version
```

如果没有安装，请访问 [Docker 官网](https://www.docker.com/) 下载并安装。

### 步骤 2: 启动代码执行服务

```bash
npm run code-execution
```

服务将在 `http://localhost:3001` 启动。

### 步骤 3: 测试服务

在浏览器中打开前端应用，选择编程语言（Python/Java/C++），输入代码并点击运行。

## 📝 完整启动流程

如果需要同时启动所有服务（前端 + 信令服务器 + 代码执行服务）：

```bash
npm run dev:all
```

或者分别启动：

```bash
# 终端 1: 前端
npm run client

# 终端 2: 信令服务器  
npm run server

# 终端 3: 代码执行服务
npm run code-execution
```

## 🔧 如果没有 Docker

可以使用在线编译器 API 方案（需要注册账号）：

1. 注册 [JDoodle](https://www.jdoodle.com/compiler-api) 或 [Judge0](https://rapidapi.com/judge0-official/api/judge0-ce)
2. 获取 API 密钥
3. 配置环境变量（创建 `.env` 文件）
4. 启动：`npm run code-execution-api`

详细配置请查看 [完整配置指南](CODE_EXECUTION_SETUP.md)

## ✅ 验证服务运行

访问健康检查端点：

```bash
curl http://localhost:3001/api/health
```

应该返回：

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "supportedLanguages": ["python", "java", "cpp", "javascript"]
}
```

## 🆘 遇到问题？

查看 [故障排除指南](CODE_EXECUTION_SETUP.md#故障排除) 或检查：

1. Docker 是否运行：`docker ps`
2. 端口 3001 是否被占用
3. 防火墙设置是否正确

## 📚 更多信息

- [完整配置指南](CODE_EXECUTION_SETUP.md)
- [多语言支持说明](../MULTI_LANGUAGE_SUPPORT.md)

