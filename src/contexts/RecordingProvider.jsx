// src/contexts/RecordingProvider.jsx
import React, { useRef, useCallback } from 'react';
// import { API_ENDPOINTS } from '../api'; //
import { RecordingContext } from './RecordingContext'; 

export const RecordingProvider = ({ children }) => {
    const workerRef = useRef(null);
    const recorderRef = useRef(null);
    const isRecordingRef = useRef(false);

    // 初始化 Worker 
    const initWorker = useCallback(() => {
        if (!workerRef.current) {
            workerRef.current = new Worker('/opfs-worker.js');
            workerRef.current.onmessage = (e) => {
                console.log('Worker status:', e.data.type);
            };
        }
    }, []);

    // --- 开始录制 ---
    const startGlobalRecording = useCallback((stream, roomId) => {
        if (isRecordingRef.current) {
            console.log("录制已经在进行中，跳过启动...");
            return;
        }

        initWorker();
        
        workerRef.current.postMessage({ type: 'INIT', payload: { roomId } });

        const recorderStream = stream.clone();
        const recorder = new MediaRecorder(recorderStream, {
            mimeType: 'video/webm; codecs=vp9',
            videoBitsPerSecond: 1000000 
        });

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                workerRef.current.postMessage({ 
                    type: 'WRITE', 
                    payload: { chunk: event.data } 
                });
            }
        };

        recorder.start(1000); 
        recorderRef.current = recorder;
        isRecordingRef.current = true;
        console.log("全局录制已启动 (OPFS)");

    }, [initWorker]);

    // --- 停止录制并保存到本地 ---
    const stopAndUploadRecording = useCallback(async (roomId) => {
        if (!recorderRef.current) return;

        return new Promise((resolve, reject) => {
            console.log("正在停止录制...");
            
            // 1. 停止 Recorder
            recorderRef.current.stop();
            recorderRef.current = null;
            isRecordingRef.current = false;

            // 2. 监听 Worker 的完成消息
            const handleWorkerMessage = async (e) => {
                if (e.data.type === 'FINISHED') {
                    workerRef.current.removeEventListener('message', handleWorkerMessage);
                    
                    try {
                        console.log("文件写入完毕，准备导出...");
                        
                        // 3. 从 OPFS 读取完整文件
                        const root = await navigator.storage.getDirectory();
                        const fileName = `interview_rec_${roomId}.webm`;
                        const fileHandle = await root.getFileHandle(fileName);
                        const file = await fileHandle.getFile();

                        // 4. 触发浏览器下载
                        const url = URL.createObjectURL(file);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName; // 设置下载文件名
                        document.body.appendChild(a);
                        a.click(); // 模拟点击下载
                        
                        // 清理
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        console.log("已触发本地下载");
                        
                        // 可选：下载后删除 OPFS 中的临时文件以释放空间
                        // await fileHandle.remove(); 

                        resolve(true);
                    } catch (err) {
                        console.error("导出文件失败:", err);
                        reject(err);
                    }
                }
            };

            workerRef.current.addEventListener('message', handleWorkerMessage);
            
            // 通知 Worker 关闭文件
            setTimeout(() => {
                if (workerRef.current) {
                    workerRef.current.postMessage({ type: 'STOP' });
                }
            }, 500);
        });
    }, []);

    return (
        <RecordingContext.Provider value={{ startGlobalRecording, stopAndUploadRecording }}>
            {children}
        </RecordingContext.Provider>
    );
};