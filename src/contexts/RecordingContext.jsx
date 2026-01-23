// src/contexts/RecordingContext.js
import { createContext, useContext } from 'react';

// 1. 创建并导出 Context 对象
export const RecordingContext = createContext(null);

// 2. 创建并导出 Hook (非组件函数)
export const useGlobalRecording = () => {
    const context = useContext(RecordingContext);
    if (!context) {
        throw new Error("useGlobalRecording must be used within a RecordingProvider");
    }
    return context;
};