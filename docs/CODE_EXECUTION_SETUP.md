# 代码执行服务配置指南

本文档说明如何配置和启动代码执行服务，以支持 Python、Java、C++ 等语言的代码执行。

## 目录

1. [方案选择](#方案选择)
2. [方案一：Docker 执行服务（推荐）](#方案一docker-执行服务推荐)
3. [方案二：在线编译器 API（快速部署）](#方案二在线编译器-api快速部署)
4. [启动服务](#启动服务)
5. [测试服务](#测试服务)
6. [故障排除](#故障排除)

## 方案选择

### 方案一：Docker 执行服务
- ✅ **安全性高**：使用容器隔离执行环境
- ✅ **完全控制**：不依赖第三方服务
- ✅ **资源限制**：可精确控制内存、CPU、执行时间
- ❌ 需要安装 Docker
- ❌ 配置相对复杂

### 方案二：在线编译器 API
- ✅ **快速部署**：无需 Docker
- ✅ **配置简单**：只需 API 密钥
- ❌ **依赖第三方**：需要注册在线编译器服务
- ❌ **可能有费用**：免费配额有限
- ❌ **安全性较低**：代码发送到第三方

**建议**：生产环境使用 Docker 方案，开发/测试环境可以使用在线 API 方案。

## 方案一：Docker 执行服务（推荐）

### 前置要求

1. **安装 Docker**
   ```bash
   # Windows/Mac: 下载并安装 Docker Desktop
   # Linux: 
   sudo apt-get update
   sudo apt-get install docker.io
   ```

2. **验证 Docker 安装**
   ```bash
   docker --version
   docker ps
   ```

### 配置步骤

1. **环境变量配置（可选）**
   
   创建 `.env` 文件（可选，使用默认值也可以）：
   ```env
   CODE_EXECUTION_PORT=3001
   USE_DOCKER=true
   ```

2. **启动服务**
   
   使用以下命令启动代码执行服务：
   ```bash
   # 方式 1: 使用 npm 脚本（需要先配置 package.json）
   npm run code-execution
   
   # 方式 2: 直接运行
   node server/code-execution-server.js
   ```

3. **验证服务运行**
   
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

### 安全配置

Docker 执行服务默认配置：

- **超时限制**：10 秒
- **内存限制**：128MB
- **网络隔离**：容器无网络访问
- **输出限制**：最大 10KB

可以在 `server/code-execution-server.js` 中修改 `EXECUTION_CONFIG` 对象来调整这些限制。

### Docker 镜像准备

服务会自动使用官方 Docker 镜像：
- Python: `python:3.11-slim`
- Java: `openjdk:17-jdk-slim`
- C++: `gcc:latest`

首次执行时会自动下载镜像，可能需要一些时间。

## 方案二：在线编译器 API（快速部署）

### 选项 A：使用 JDoodle API

1. **注册账号**
   
   访问 [JDoodle](https://www.jdoodle.com/compiler-api) 注册账号并获取 API 凭证。

2. **配置环境变量**
   
   创建 `.env` 文件：
   ```env
   CODE_EXECUTION_PORT=3001
   JDOODLE_CLIENT_ID=your_client_id
   JDOODLE_CLIENT_SECRET=your_client_secret
   ```

3. **启动服务**
   ```bash
   node server/code-execution-api.js
   ```

### 选项 B：使用 Judge0 API

1. **获取 API Key**
   
   如果使用 RapidAPI 上的 Judge0：
   - 访问 [Judge0 on RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce)
   - 注册并获取 API Key

2. **配置环境变量**
   ```env
   CODE_EXECUTION_PORT=3001
   JUDGE0_ENDPOINT=https://judge0-ce.p.rapidapi.com
   JUDGE0_API_KEY=your_api_key
   ```

3. **启动服务**
   ```bash
   node server/code-execution-api.js
   ```

**注意**：使用在线 API 方案需要安装 `node-fetch`：
```bash
npm install node-fetch
```

## 启动服务

### 开发环境

同时启动前端、信令服务器和代码执行服务：

```bash
# 在项目根目录
npm run dev:all
```

或者分别启动：

```bash
# 终端 1: 前端
npm run client

# 终端 2: 信令服务器
npm run server

# 终端 3: 代码执行服务（Docker 方案）
npm run code-execution

# 或在线 API 方案
npm run code-execution-api
```

### 生产环境

1. **使用 PM2（推荐）**
   ```bash
   npm install -g pm2
   pm2 start server/code-execution-server.js --name code-execution
   pm2 save
   pm2 startup
   ```

2. **使用 systemd（Linux）**
   
   创建 `/etc/systemd/system/code-execution.service`：
   ```ini
   [Unit]
   Description=Code Execution Service
   After=network.target

   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/project
   ExecStart=/usr/bin/node server/code-execution-server.js
   Restart=always
   Environment=NODE_ENV=production
   Environment=CODE_EXECUTION_PORT=3001

   [Install]
   WantedBy=multi-user.target
   ```
   
   然后启动：
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable code-execution
   sudo systemctl start code-execution
   ```

## 测试服务

### 测试 Python 代码执行

```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, World!\")",
    "language": "python"
  }'
```

### 测试 Java 代码执行

```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "public class Main { public static void main(String[] args) { System.out.println(\"Hello, World!\"); } }",
    "language": "java"
  }'
```

### 测试 C++ 代码执行

```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <iostream>\nusing namespace std;\nint main() { cout << \"Hello, World!\" << endl; return 0; }",
    "language": "cpp"
  }'
```

## 故障排除

### Docker 相关错误

1. **"Docker 不可用"错误**
   - 确保 Docker 已安装并运行
   - 检查 Docker 服务状态：`docker ps`
   - 确保当前用户有 Docker 权限

2. **"镜像拉取失败"**
   - 检查网络连接
   - 手动拉取镜像：`docker pull python:3.11-slim`

3. **"权限被拒绝"**
   - Linux 用户需要加入 docker 组：`sudo usermod -aG docker $USER`
   - 重新登录后生效

### API 相关错误

1. **"API 凭证未配置"**
   - 检查环境变量是否正确设置
   - 确认 `.env` 文件在正确位置

2. **"请求超时"**
   - 检查代码执行服务是否运行
   - 检查防火墙设置
   - 增加超时时间配置

3. **"CORS 错误"**
   - 确认服务器 CORS 配置正确
   - 检查前端请求的 URL

### 性能优化

1. **减少执行时间**
   - 调整 `EXECUTION_CONFIG.timeout` 值
   - 使用更快的 Docker 镜像

2. **优化资源使用**
   - 调整内存限制
   - 使用容器复用策略

## 安全建议

1. **生产环境配置**
   - 使用 Docker 方案，确保隔离性
   - 设置严格的内存和时间限制
   - 启用日志记录和监控

2. **网络安全**
   - 使用 HTTPS
   - 配置防火墙规则
   - 限制访问来源

3. **代码验证**
   - 实施代码安全检查
   - 限制可执行的操作
   - 监控异常行为

## 更新日志

- **v1.0.0** (2024-01-01)
  - 初始版本
  - 支持 Python、Java、C++ 代码执行
  - Docker 和在线 API 两种方案

