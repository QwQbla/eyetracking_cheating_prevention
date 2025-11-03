//webrtc-interview\src\contexts\WebgazerProvider.jsx
import React, { useState, useRef, useCallback ,useEffect} from 'react';
import { WebgazerContext } from './WebgazerContext.jsx'; 
import webgazer from 'webgazer';

export const WebgazerProvider = ({ children }) => {
  const [status, setStatus] = useState({
    isReady: false,
    message: 'WebGazer 处于空闲状态。',
    instance: null
  });
  const [stream, setStream] = useState(null); 
  const streamRef = useRef(null);

  // 使用 useRef 来持有 WebGazer 实例，避免不必要的重渲染
  const webgazerInstance = useRef(null);

  /**
   * 初始化并启动 WebGazer
   */
  const initializeWebgazer = useCallback(async () => {
    // 防止重复初始化
    if (webgazerInstance.current || status.isReady) {
        console.log("WebGazer 已经初始化或正在初始化中。");
        return;
    }

    try {
      setStatus(prev => ({ ...prev, message: '正在初始化 WebGazer...' }));
      if (!streamRef.current) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = mediaStream;
        setStream(mediaStream);
      }

      webgazer.setRegression('weightedRidge');
      webgazer.setTracker('clmtrackr');
      webgazer.saveDataAcrossSessions(true);
      webgazer.applyKalmanFilter(true);

      const instance = await webgazer.begin({
        stream: streamRef.current
      });
      webgazerInstance.current = instance;

      webgazer.showVideo(false);                 // 隐藏摄像头预览画面
      webgazer.showFaceOverlay(false);           // 隐藏绿色的面部轮廓
      webgazer.showPredictionPoints(false);      // 隐藏红色的眼动预测点

      // webgazer.setGazeListener(...)
      setStatus({ isReady: true, message: 'WebGazer 初始化成功。', instance });
      console.log("WebGazer context: 初始化成功。");

    } catch (error) {
      console.error("初始化 WebGazer 失败:", error);
      setStatus({ isReady: false, message: `错误: ${error.message}`, instance: null });
    }
    
  }, [status.isReady]);

  /**
   * 关闭并清理 WebGazer 实例
   */
  const shutdownWebgazer = useCallback(() => {
      // 关闭 webgazer 实例
      try {
          if (webgazerInstance.current) {
              webgazer.end();
              webgazerInstance.current = null;
          }
      } catch (error) {
          console.error("关闭 webgazer 实例时出错:", error);
      }
      //关闭视频流 (无论步骤 1 是否成功)
      try {
          if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
              setStream(null);
              console.log('摄像头已关闭');
          }
      } catch (error) {
          console.error("关闭 MediaStream 轨道时出错:", error);
      }

      setStatus({ isReady: false, message: 'WebGazer 已关闭。' });
      console.log("WebGazer context: 已关闭。");
    }, []); // 依赖项为空，保持不变


  useEffect(() => {
        
    // 返回一个清理函数
    return () => {
        console.log("WebgazerProvider 即将卸载，执行自动清理...");
        // 无论如何，当 Provider 消失时，都调用关闭函数
        shutdownWebgazer(); 
        };
    }, [shutdownWebgazer]); // 依赖 shutdownWebgazer 函数

    // 传递给所有子组件的值
    const value = {
      status,
      initializeWebgazer,
      shutdownWebgazer,
      stream
    };

  return (
    <WebgazerContext.Provider value={value}>
      {children}
    </WebgazerContext.Provider>
  );
};
