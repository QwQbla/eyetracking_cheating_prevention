# 代码执行服务快速开始

## 快速启动

### 方式一：Docker 执行服务（推荐）

1. **确保 Docker 已安装并运行**
   ```bash
   docker --version
   ```

2. **启动代码执行服务**
   ```bash
   npm run code-execution
   ```

3. **服务将在端口 3001 启动**
   - 健康检查: http://localhost:3001/api/health
   - API 端点: http://localhost:3001/api/execute

### 方式二：在线编译器 API（无需 Docker）

1. **配置 API 凭证（选择一种）**
   
   **选项 A: JDoodle**
   ```bash
   # 在 .env 文件中设置
   JDOODLE_CLIENT_ID=your_client_id
   JDOODLE_CLIENT_SECRET=your_client_secret
   ```

   **选项 B: Judge0**
   ```bash
   JUDGE0_ENDPOINT=https://judge0-ce.p.rapidapi.com
   JUDGE0_API_KEY=your_api_key
   ```

2. **安装依赖（如果需要）**
   ```bash
   npm install node-fetch
   ```

3. **启动服务**
   ```bash
   npm run code-execution-api
   ```

## 同时启动所有服务

```bash
npm run dev:all
```

这会同时启动：
- 前端开发服务器（端口 5173）
- Socket.IO 信令服务器（端口 8080）
- 代码执行服务（端口 3001）

## 测试

在前端界面中：
1. 选择编程语言（Python、Java 或 C++）
2. 输入代码
3. 点击"运行代码"按钮

如果服务配置正确，代码将被执行并显示结果。

## 详细文档

更多配置选项和故障排除，请查看：
- [完整配置指南](docs/CODE_EXECUTION_SETUP.md)
- [多语言支持说明](docs/MULTI_LANGUAGE_SUPPORT.md)

