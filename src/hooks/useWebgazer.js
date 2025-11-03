//webrtc-interview\src\hooks\useWebgazer.js
import { useContext } from 'react';
import { WebgazerContext } from '../contexts/WebgazerContext.jsx';

export const useWebgazer = () => {
  const context = useContext(WebgazerContext);
  if (context === undefined) {
    throw new Error('useWebgazer 必须在 WebgazerProvider 内部使用');
  }
  return context;
};