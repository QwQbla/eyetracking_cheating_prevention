//webrtc-interview\src\contexts\WebgazerContext.jsx
import React, { createContext} from 'react';

export const WebgazerContext = createContext({
  status: { isReady: false, message: '正在初始化 Context...' },
  stream: null,
  initializeWebgazer: () => Promise.reject(new Error("WebgazerContext 尚未準備好")),
  shutdownWebgazer: () => {},
});
