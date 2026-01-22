// eyetracking_cheating_prevention/src/pages/IntervieweeContent.jsx

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../api';
// 核心库
import { io } from 'socket.io-client';
import webgazer from 'webgazer';
import swal from 'sweetalert';

// 相关组件与钩子 (Hooks)
import SharedCodeEditor from '../components/SharedCodeEditor';
import { useWebgazer } from '../hooks/useWebgazer';

// 样式
import styles from '../styles/SharedLayout.module.css';
import '../styles/IntervieweeContent.css';

const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

/**
 * 应聘者面试内容页面
 * 整合了 WebRTC 视频、Socket.IO 信令、DataChannel 数据、Webgazer 眼动追踪、以及后端心跳上报功能。
 */
const IntervieweeContent = () => {

    // --- 核心 Hooks ---
    const navigate = useNavigate();
    const { roomId } = useParams(); // 从 URL 获取动态房间 ID
    const { stream, shutdownWebgazer } = useWebgazer(); // 从 Context 获取共享视频流

    // --- 状态 (State) ---
    // 从 sessionStorage 恢复代码，否则使用默认值
    const [code, setCode] = useState(() => {
        const savedCode = sessionStorage.getItem(`interview_code_${roomId}`);
        return savedCode !== null ? savedCode : '// 在此输入代码...';
    });
    // 从 sessionStorage 恢复问题
    const [question, setQuestion] = useState(() => {
        const savedQuestion = sessionStorage.getItem(`interview_question_${roomId}`);
        return savedQuestion !== null ? savedQuestion : '请等待面试官发布题目...';
    });
    //const [executionResult, setExecutionResult] = useState(''); // 代码执行结果
    const [statusLog, setStatusLog] = useState([]); // 面试状态日志
    const [isInterviewOver, setIsInterviewOver] = useState(false); // 标记面试是否已由后端结束

    // --- 引用 ---
    // DOM 引用
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const statusPanelRef = useRef(null); // 状态面板 (用于自动滚动)
    // 实例与连接引用
    const pcRef = useRef(null); // WebRTC PeerConnection
    const socketRef = useRef(null); // Socket.IO
    const dataChannelRef = useRef(null); // WebRTC DataChannel
    const workerRef = useRef(null); // 代码执行 Worker
    // 数据与定时器引用
    const candidateQueueRef = useRef([]); // ICE 候选队列
    const gazeDataBuffer = useRef([]); // 眼动数据缓冲区 (用于5秒上报)
    const intervalIdRef = useRef(null); // 心跳/上报定时器 ID

    // --- 核心功能函数 ---

    /**
     * 最终清理函数
     * 负责停止所有正在运行的进程、关闭连接、清除定时器并导航
     */
    const performCleanupAndNavigate = useCallback(() => {
        console.log("正在清理资源并返回主页面...");
        
        // 0. 发送离开房间的状态更新（在断开连接之前）
        if (socketRef.current) {
            const leaveStatus = {
                id: Date.now(),
                type: 'info',
                message: '应聘者已离开房间'
            };
            socketRef.current.emit('status-update', leaveStatus);
        }
        
        // 1. 停止数据上传定时器
        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }
        // 2. 清理 Webgazer
        shutdownWebgazer(); // 关闭摄像头和 Webgazer 实例
        webgazer.clearGazeListener(); // 移除眼动监听
        
        // 3. 清理 WebRTC
        if (pcRef.current) pcRef.current.close();
        if (dataChannelRef.current) dataChannelRef.current.close();
        
        // 4. 清理 Socket.IO（延迟断开，确保消息能够发送）
        setTimeout(() => {
            if (socketRef.current) socketRef.current.disconnect();
        }, 100);
        
        // 5. 清理 Worker
        if (workerRef.current) workerRef.current.terminate();
        
        // 6. 清理 sessionStorage
        sessionStorage.removeItem(`interview_code_${roomId}`);
        sessionStorage.removeItem(`interview_question_${roomId}`);
        
        // 7. 导航回主页（延迟导航，确保消息能够发送）
        setTimeout(() => {
            navigate('/interviewee/home');
        }, 150);
    }, [navigate, roomId, shutdownWebgazer]);

    /**
     * 处理由后端触发的面试时间结束事件
     */
    const handleInterviewEnd = useCallback(() => {
        if (isInterviewOver) return; // 防止重复触发
        setIsInterviewOver(true);

        // 立即停止数据上传定时器
        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }

        // 显示弹窗
        swal({
            title: "面试已结束",
            text: "本次面试时间已到。",
            icon: "info",
            button: "确定",
            closeOnClickOutside: false,
            closeOnEsc: false,
        }).then(() => {
            // 点击确定后清理并导航
            performCleanupAndNavigate();
        });
    }, [isInterviewOver, performCleanupAndNavigate]); // 依赖清理函数

    // --- 副作用钩子 (Effects) ---

    // Effect 1: 初始化代码执行 Worker
    useEffect(() => {
        workerRef.current = new Worker('/coderunner.js');
        workerRef.current.onmessage = (event) => {
            //const resultString = JSON.stringify(event.data, null, 2);
            if (socketRef.current) {
                socketRef.current.emit('code-result', event.data);
            }
            //setExecutionResult(resultString);
        };
        return () => {
            if (workerRef.current) workerRef.current.terminate();
        };
    }, []); // 空依赖，仅运行一次

    // Effect 2: 核心连接 (Webgazer, Socket.IO, WebRTC)
    useEffect(() => {
        if (!stream) {
            console.log("等待共享视频流...");
            return;
        }

        // 2a. 关闭鼠标点击和移动监听（校准完成后不再需要收集训练数据）
        webgazer.removeMouseEventListeners();
        console.log("已关闭鼠标点击和移动监听器");

        // 2b. 启动 Webgazer 监听 (眼动数据 P2P 发送 + 后端缓冲)
        webgazer.setGazeListener((data) => { // 修正: _elapsedTime
            if (data == null) return;

            // 将绝对坐标转换为归一化坐标（相对比例，0-1之间）
            const normalizedX = data.x / window.innerWidth;
            const normalizedY = data.y / window.innerHeight;

            // 2a-1. 推入缓冲区，用于后端5秒上报（存储归一化坐标）
            gazeDataBuffer.current.push({
                x: normalizedX,
                y: normalizedY,
                timestamp: Date.now()
            });

            // 2a-2. 通过 P2P DataChannel 实时发送给面试官（发送归一化坐标）
            if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                const dataToSend = { 
                    type: 'gaze', 
                    content: { 
                        x: normalizedX, 
                        y: normalizedY, 
                        t: Date.now() 
                    } 
                };
                dataChannelRef.current.send(JSON.stringify(dataToSend));
            }
        });

        // 2c. 初始化 Socket.IO 连接
        //const socket = io('http://localhost:8080');
        const socket = io('https://signaling.deepalgo.cn');
        socketRef.current = socket;

        // 2d. Socket.IO 事件监听
        socket.on('connect', () => {
            console.log('面试者：信令服务器已连接', socket.id);
            socket.emit('join-room', roomId);

            const myStatus = {
                id: Date.now(),
                type: 'success',
                message: '应聘者已进入房间'
            };
            socket.emit('status-update', myStatus);
            setStatusLog([myStatus]);
        });

        socket.on('status-update', (data) => {
            console.log('收到状态更新:', data.message);
            setStatusLog(prevLog => [...prevLog, { ...data, id: Date.now() }]);

            if (data.message && data.message.includes('面试官已进入房间')) {
                console.log('检测到面试官进入，应聘者发送存在反馈...');
                setTimeout(() => {
                    const feedbackStatus = {
                        id: Date.now(),
                        type: 'info',
                        message: '应聘者已在房间内'
                    };
                    socket.emit('status-update', feedbackStatus);
                }, 500);
            }
            
        });

        // 2e. WebRTC 核心逻辑
        socket.on('offer', async (offerSdp) => {
            console.log('面试者：收到 Offer');
            const pc = new RTCPeerConnection(configuration);
            pcRef.current = pc;

            // 接收 DataChannel
            pc.ondatachannel = (event) => {
                const dataChannel = event.channel;
                dataChannelRef.current = dataChannel;
                dataChannel.onopen = () => console.log("应聘者：数据通道已开启!");
                dataChannel.onclose = () => console.log("应聘者：数据通道已关闭。");
                dataChannel.onmessage = (event) => {
                    console.log("收到面试官通过DataChannel发来的消息:", event.data);
                };
            };

            // ICE 候选
            pc.onicecandidate = (event) => {
                if (event.candidate && socketRef.current) {
                    socketRef.current.emit('ice-candidate', event.candidate);
                }
            };

            // 接收远程媒体流
            pc.ontrack = (event) => {
                if (remoteVideoRef.current && event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            // 添加本地媒体流
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Offer/Answer 协商
            await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

            while (candidateQueueRef.current.length > 0) {
                const candidate = candidateQueueRef.current.shift();
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            if (socketRef.current) {
                socketRef.current.emit('answer', pc.localDescription);
            }
        });

        socket.on('ice-candidate', async (candidate) => {
            if (pcRef.current && pcRef.current.remoteDescription) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                candidateQueueRef.current.push(candidate);
            }
        });

        // 2f. 应用数据同步 (Socket.IO)
        socket.on('code-update', (newCode) => {
            setCode(newCode);
            sessionStorage.setItem(`interview_code_${roomId}`, newCode);
        });

        /*socket.on('code-result', (result) => {
            setExecutionResult(JSON.stringify(result, null, 2));
        });*/

        socket.on('question-update', (receivedQuestion) => {
            setQuestion(receivedQuestion);
            sessionStorage.setItem(`interview_question_${roomId}`, receivedQuestion);
        });

        // 2g. 清理函数
        return () => {
            // 发送离开房间的状态更新（组件卸载时）
            if (socket && socket.connected) {
                const leaveStatus = {
                    id: Date.now(),
                    type: 'info',
                    message: '应聘者已离开房间'
                };
                socket.emit('status-update', leaveStatus);
                // 延迟断开，确保消息能够发送
                setTimeout(() => {
                    if (socket) socket.disconnect();
                }, 100);
            } else {
                if (socket) socket.disconnect();
            }
            webgazer.clearGazeListener();
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            socketRef.current = null; // 清理 ref
        };
    }, [stream, roomId]); // 依赖 stream 和 roomId

    // Effect 3: 状态面板自动滚动
    useEffect(() => {
        if (statusPanelRef.current) {
            statusPanelRef.current.scrollTop = statusPanelRef.current.scrollHeight;
        }
    }, [statusLog]); // 依赖 statusLog

    // Effect 4: 定时上报眼动数据 (心跳)
    useEffect(() => {
        // 将 intervalId 存入 ref
        intervalIdRef.current = setInterval(async () => {
            if (isInterviewOver) return; // 如果面试已结束，则停止上报

            if (gazeDataBuffer.current.length > 0) {
                const dataToSend = [...gazeDataBuffer.current];
                gazeDataBuffer.current = [];

                //console.log(`打包 ${dataToSend.length} 条眼动数据并发送给后端...`);

                try {
                    const response = await fetch(API_ENDPOINTS.gazeData, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:JSON.stringify({
                            fjh: roomId, // 房间号 (fjh)
                            time: new Date().toISOString(),
                            zuobiao: dataToSend 
                        })
                    });

                    if (!response.ok) {
                        console.error('发送眼动数据失败:', response.statusText);
                    } else {
                        const result = await response.json();
                        //console.log('后端状态:', result.zt);
                        if (result.zt === "已完成" || result.zt === "已过期") {
                            handleInterviewEnd(); // 触发面试结束
                        }
                    }
                } catch (error) {
                    console.error('网络错误，发送眼动数据失败:', error);
                }
            }
        }, 5000); // 每 5 秒执行一次

        // 清理定时器
        return () => {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
            }
        };
    }, [roomId, handleInterviewEnd, isInterviewOver]); // 依赖

    // --- 事件处理器 (Event Handlers) ---

    // 用户主动离开
    const handleReturnToMenu = () => {
        performCleanupAndNavigate();
    };

    // 运行代码
    /*const runCode = () => {
        if (workerRef.current) {
            setExecutionResult('正在执行代码...');
            workerRef.current.postMessage({ code });
        }
    };*/
    
    // 代码编辑器内容改变
    const handleCodeChange = (newCode) => {
        setCode(newCode);
        sessionStorage.setItem(`interview_code_${roomId}`, newCode);
        if (socketRef.current) {
            socketRef.current.emit('code-update', newCode);
        }
    };

    return (
        <div className={styles.pageContainer}>
            {/* 侧边栏 */}
            <div className={styles.sidebar}>
                <h2>面试者端</h2>
                <video ref={localVideoRef} autoPlay playsInline muted className={styles.videoPlayer} />
                <video ref={remoteVideoRef} autoPlay playsInline className={styles.videoPlayer} />

                <h4>面试状态</h4>
                <div className={styles.statusPanel} ref={statusPanelRef}>
                    <ul>
                        {statusLog.map((logItem) => (
                            <li key={logItem.id} className={styles[logItem.type]}>
                                {logItem.message}
                            </li>
                        ))}
                    </ul>
                </div>

                <button
                    onClick={handleReturnToMenu}
                    className={styles.button}
                    style={{ width: '100%', marginBottom: '1rem' }}
                >
                    离开面试
                </button>
            </div>

            {/* 主工作区 */}
            <div className={styles.mainWorkspace}>
                {/* 问题列 */}
                <div className={styles.questionColumn}>
                    <div className={styles.contentCard}>
                        <h4>问题区</h4>
                        <pre className={styles.questionEditor}>
                            {question}
                        </pre>
                    </div>
                </div>

                {/* 代码与结果列 */}
                <div className={styles.codeResultColumn}>
                    {/* 代码卡片 */}
                    <div className={`${styles.contentCard} ${styles.codeCard}`}>
                        <h4>代码区</h4>
                        <SharedCodeEditor code={code} onCodeChange={handleCodeChange} />
                        {/* 修正: onClick 和 className 之间添加空格 */}
                        {/*<button onClick={runCode} className={`${styles.button} ${styles.runButton}`}>运行代码</button>*/}
                    </div>


                </div>
            </div>
        </div>
    );
}

export default IntervieweeContent;