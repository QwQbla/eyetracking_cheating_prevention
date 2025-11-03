// public/code-runner.js

// 拦截 console.log
const logs = [];
const originalConsoleLog = console.log;
console.log = (...args) => {
  // 将所有参数转换成字符串并收集起来
  logs.push(args.map(arg => {
    try {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    } catch  {
      return 'Unserializable object';
    }
  }).join(' '));
  originalConsoleLog(...args); // 同时也保留在 worker 控制台的原始输出
};

// 监听来自主线程的消息
self.onmessage = (event) => {
  const { code } = event.data;
  logs.length = 0; // 每次运行前清空上次的日志

  try {
    // 使用 Function 构造函数来执行代码，而不是 eval，相对更安全一些
    const run = new Function(code);
    const result = run();
    
    // 将结果和日志一起发送回主线程
    self.postMessage({
      result: result !== undefined ? JSON.stringify(result, null, 2) : 'undefined',
      logs: logs,
      error: null
    });

  } catch (error) {
    // 如果发生错误，发送错误信息
    self.postMessage({
      result: null,
      logs: logs,
      error: error.toString()
    });
  }
};