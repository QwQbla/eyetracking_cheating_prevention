// signaling-server.js
import { Server } from 'socket.io';

// 启动服务器，并配置 CORS 策略，允许任何来源的连接
const io = new Server(8080, {
  cors: {
    origin: "*", 
  }
});

console.log('Socket.IO 信令服务器已启动在 8080 端口');

// 监听客户端连接事件
io.on('connection', (socket) => {
  console.log(`新客户端连接: ${socket.id}`);

  // 1. 处理加入房间的逻辑
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`客户端 ${socket.id} 加入房间: ${roomId}`);
  });

  // 2. 统一处理所有需要转发的消息
  const forwardEvents = ['offer', 'answer', 'ice-candidate', 'code-update', 'code-result', 'question-update', 'status-update'];
  
  forwardEvents.forEach(eventName => {
    socket.on(eventName, (data) => {
      // 从 socket.rooms 中找到它所在的房间
      // (socket.rooms 是一个 Set, 包含了 socket.id 和它加入的房间)
      const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
      if (roomId) {
        // 使用 .to(roomId) 精准广播给房间内的其他人
        // Socket.IO 会自动确保消息不会发回给发送者自己
        socket.to(roomId).emit(eventName, data);
      }
    });
  });

  // 3. 处理断开连接
  socket.on('disconnect', () => {
    console.log(`客户端断开连接: ${socket.id}`);
    // Socket.IO 会自动处理将客户端移出房间的逻辑，无需手动管理
  });
});