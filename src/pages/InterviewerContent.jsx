// eyetracking_cheating_prevention/src/pages/InterviewerContent.jsx

// --- 1. 导入 (Imports) ---
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// 核心库
import { io } from 'socket.io-client';

// 相关组件与工具
import SharedCodeEditor from '../components/SharedCodeEditor';
import { 
    ReadingDetector, 
    calculateCentroid, 
    calculateAmplitude, 
    calculateDirection,
    GLOBAL_DISPERSION_THRESHOLD,
    WINDOW_DURATION_MS,
    FIXATION_MIN_DURATION_MS,
    FIXATION_MAX_DURATION_MS,
    SACCADE_MIN_AMPLITUDE_PX,
    SACCADE_MAX_AMPLITUDE_PX
} from '../utils/GazeAnalysis';

// 样式
import styles from '../styles/SharedLayout.module.css';
// import '../styles/InterviewerContent.css'; 

// --- 2. 常量 (Constants) ---
// WebRTC 配置
const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

// I-DT 算法参数 
const MIN_POINTS_FOR_FIXATION = 5; // 最小点数

/**
 * 面试官面试内容页面
 * 负责 WebRTC 连接建立、接收眼动数据、执行 I-DT 分析并展示结果。
 */
const InterviewerContent = () => {

    // --- 3. 基础 Hooks ---
    const navigate = useNavigate();
    const { roomId } = useParams(); // 获取动态房间 ID

    // --- 4. 状态 (State) ---
    // 从 sessionStorage 恢复数据
    const [code, setCode] = useState(() => {
        const savedCode = sessionStorage.getItem(`interview_code_${roomId}`);
        return savedCode !== null ? savedCode : '// 在此输入代码...';
    });
    const [question, setQuestion] = useState(() => {
        const savedQuestion = sessionStorage.getItem(`interview_question_${roomId}`);
        return savedQuestion !== null ? savedQuestion : '请在此输入面试题目...';
    });
    const [executionResult, setExecutionResult] = useState('');
    // 面试状态日志
    const [statusLog, setStatusLog] = useState([]);
    // 应聘者实时数据展示
    const [gazePoint, setGazePoint] = useState({ x: -100, y: -100, visible: false });
    const [intervieweeBehavior, setIntervieweeBehavior] = useState('等待数据...');
    const [behaviorClass, setBehaviorClass] = useState(''); // 用于控制行为面板颜色的 CSS 类名

    // --- 5. 引用 (Refs) ---
    // DOM 引用
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const statusPanelRef = useRef(null);
    // 连接与实例引用
    const pcRef = useRef(null);
    const socketRef = useRef(null);
    const dataChannelRef = useRef(null);
    const localStreamRef = useRef(null); // *关键：保存本地视频流以便清理
    const workerRef = useRef(null);
    // 分析算法状态引用
    const gazeWindowRef = useRef([]);           // L1: I-DT 滑动窗口
    const currentEventRef = useRef({            // L1: 当前事件状态机
        state: 'IDLE', 
        points: [],
        startTime: null  // 添加开始时间追踪
    });
    const readingDetectorRef = useRef(new ReadingDetector()); // L2: 模式识别器实例

    // --- 6. 核心分析逻辑 (L1 + L2) ---
    const processGazeData = useCallback((x, y, t) => {
        const point = { x, y, timestamp: t };
        
        // --- L1 第1步: I-DT 窗口分类 ---
        const gazeWindow = gazeWindowRef.current;
        gazeWindow.push(point);
        // 移除过期数据点
        while (gazeWindow.length > 0 && gazeWindow[0].timestamp < (t - WINDOW_DURATION_MS)) {
            gazeWindow.shift();
        }

        let instantClassification = 'Saccade'; // 默认瞬时状态为眼跳
        if (gazeWindow.length >= MIN_POINTS_FOR_FIXATION) {
             let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
             for (const p of gazeWindow) {
                 if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                 if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
             }
             // 计算离散度
             const dispersion = (maxX - minX) + (maxY - minY);
             if (dispersion <= GLOBAL_DISPERSION_THRESHOLD) {
                 instantClassification = 'Fixation'; // 离散度低，判定为注视
                 console.log(`[I-DT] 检测到注视 - 窗口点数: ${gazeWindow.length}, 离散度: ${dispersion.toFixed(2)}`);
             } else {
                 console.log(`[I-DT] 检测到眼跳 - 窗口点数: ${gazeWindow.length}, 离散度: ${dispersion.toFixed(2)}`);
             }
        }

        // --- L1 第2步: 事件状态机 ---
        const currentEvent = currentEventRef.current;
        const newState = (instantClassification === 'Fixation') ? 'FIXATING' : 'SACCADING';

        if (currentEvent.state === 'IDLE') {
            currentEvent.state = newState;
            currentEvent.startTime = t;
            currentEvent.points.push(point);
            console.log(`[状态机] 初始状态: ${newState}`);
            return;
        }

        // 检查是否超时（同一状态持续超过1秒强制提交）
        const eventDuration = t - currentEvent.startTime;
        const shouldForceSubmit = eventDuration > 1000;

        if (newState === currentEvent.state && !shouldForceSubmit) {
            currentEvent.points.push(point); // 状态未变，继续累积点
            return;
        }

        // 状态改变或超时，打印日志
        if (shouldForceSubmit) {
            console.log(`[状态机] 状态超时强制提交: ${currentEvent.state}, 持续时间: ${eventDuration.toFixed(0)}ms`);
        } else {
            console.log(`[状态机] 状态切换: ${currentEvent.state} -> ${newState}`);
        }

        // --- 状态改变！提交上一个事件到 L2 ---
        const points = currentEvent.points;
        if (points.length > 0) {
            const startTime = points[0].timestamp;
            const endTime = points[points.length - 1].timestamp;
            const duration = endTime - startTime;
            let eventObject = null;

            // 根据事件类型构建事件对象
            if (currentEvent.state === 'FIXATING') {
                // 使用 FIXATION_MIN_DURATION_MS 和 FIXATION_MAX_DURATION_MS 过滤注视
                if (duration >= FIXATION_MIN_DURATION_MS && duration <= FIXATION_MAX_DURATION_MS) {
                    const centroid = calculateCentroid(points);
                    eventObject = {
                        type: 'Fixation', startTime, endTime, duration,
                        centroid
                    };
                    console.log(`[事件] 注视完成 - 时长: ${duration.toFixed(0)}ms, 中心: (${centroid.x.toFixed(0)}, ${centroid.y.toFixed(0)})`);
                } else {
                    if (duration < FIXATION_MIN_DURATION_MS) {
                        console.log(`[事件] 注视太短被忽略 - 时长: ${duration.toFixed(0)}ms (最小: ${FIXATION_MIN_DURATION_MS}ms)`);
                    } else {
                        console.log(`[事件] 注视太长被忽略 - 时长: ${duration.toFixed(0)}ms (最大: ${FIXATION_MAX_DURATION_MS}ms)`);
                    }
                }
            } else { // SACCADING
                const startPoint = points[0];
                const endPoint = points[points.length - 1];
                const amplitude = calculateAmplitude(startPoint, endPoint);
                // 使用 SACCADE_MIN_AMPLITUDE_PX 和 SACCADE_MAX_AMPLITUDE_PX 过滤眼跳
                if (amplitude >= SACCADE_MIN_AMPLITUDE_PX && amplitude <= SACCADE_MAX_AMPLITUDE_PX) {
                    const direction = calculateDirection(startPoint, endPoint);
                    eventObject = {
                        type: 'Saccade', startTime, endTime, duration,
                        startPoint, endPoint,
                        amplitude,
                        direction
                    };
                    console.log(`[事件] 眼跳完成 - 时长: ${duration.toFixed(0)}ms, 幅度: ${amplitude.toFixed(0)}px, 方向: ${direction}`);
                } else {
                    if (amplitude < SACCADE_MIN_AMPLITUDE_PX) {
                        console.log(`[事件] 眼跳太小被忽略 - 幅度: ${amplitude.toFixed(0)}px (最小: ${SACCADE_MIN_AMPLITUDE_PX}px)`);
                    } else {
                        console.log(`[事件] 眼跳太大被忽略 - 幅度: ${amplitude.toFixed(0)}px (最大: ${SACCADE_MAX_AMPLITUDE_PX}px)`);
                    }
                }
            }

            // --- L2: 模式识别 ---
            if (eventObject) {
                // 将事件交给检测器，获取高级状态
                const result = readingDetectorRef.current.addEvent(eventObject);
                console.log(`[行为分析] 当前状态: ${result.status}, 置信度: ${readingDetectorRef.current.readingConfidence.toFixed(3)}`);
                // 更新 UI 状态
                setIntervieweeBehavior(result.status);
                setBehaviorClass(result.className);
            }
        }

        // 重置状态机以开始新事件
        if (shouldForceSubmit) {
            // 超时情况：保持当前状态，只清空点
            currentEvent.points = [point];
            currentEvent.startTime = t;
        } else {
            // 状态切换：切换到新状态
            currentEvent.state = newState;
            currentEvent.points = [point];
            currentEvent.startTime = t;
        }

    }, []); // 空依赖

    // --- 7. 副作用 (Effects) ---

    // Effect 1: 初始化代码执行 Worker
    useEffect(() => {
        workerRef.current = new Worker('/coderunner.js');
        workerRef.current.onmessage = (event) => {
            const resultString = JSON.stringify(event.data, null, 2);
            if (socketRef.current) {
                socketRef.current.emit('code-result', event.data);
            }
            setExecutionResult(resultString);
        };
        return () => workerRef.current.terminate();
    }, []);

    // Effect 2: 核心信令连接 (Socket.IO) & 资源清理
    useEffect(() => {
        //const socket = io('http://localhost:8080');
        const socket = io('https://signaling.deepalgo.cn');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('面试官:信令服务器已连接', socket.id);
            // 加入房间
            socket.emit('join-room', roomId);
            
            // 发送面试官进入房间的状态更新
            const myStatus = {
                id: Date.now(),
                type: 'success',
                message: '面试官已进入房间'
            };
            socket.emit('status-update', myStatus);
            setStatusLog([myStatus]);
        });

        // 监听服务器转发的状态更新
        socket.on('status-update', (data) => {
            console.log('收到状态更新:', data.message);
            setStatusLog(prevLog => [...prevLog, { ...data, id: Date.now() }]);
        });

        // WebRTC 信令
        socket.on('answer', async (answerSdp) => {
            if (pcRef.current && pcRef.current.signalingState !== 'stable') {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(answerSdp));
            }
        });
        socket.on('ice-candidate', async (candidate) => {
            if (pcRef.current) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        // 数据同步
        socket.on('code-update', (newCode) => {
            setCode(newCode);
            sessionStorage.setItem(`interview_code_${roomId}`, newCode);
        });
        socket.on('code-result', (result) => {
            setExecutionResult(JSON.stringify(result, null, 2));
        });
        socket.on('question-update', (newQuestion) => { 
             setQuestion(newQuestion);
             sessionStorage.setItem(`interview_question_${roomId}`, newQuestion);
        });

        // 清理函数
        return () => {
            // 发送离开房间的状态更新（组件卸载时）
            if (socket && socket.connected) {
                const leaveStatus = {
                    id: Date.now(),
                    type: 'info',
                    message: '面试官已离开房间'
                };
                socket.emit('status-update', leaveStatus);
                // 延迟断开，确保消息能够发送
                setTimeout(() => {
                    if (socket) socket.disconnect();
                }, 100);
            } else {
                if (socket) socket.disconnect();
            }
            if (pcRef.current) pcRef.current.close();
            // * 修复：使用 localStreamRef 正确关闭摄像头
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                console.log('面试官端摄像头已关闭');
            }
        };
    }, [roomId]);

    // Effect 3: 状态面板自动滚动
    useEffect(() => {
        if (statusPanelRef.current) {
            statusPanelRef.current.scrollTop = statusPanelRef.current.scrollHeight;
        }
    }, [statusLog]);

    // --- 8. 事件处理器 ---

    const startCall = async () => {
        console.log('面试官：开始呼叫流程...');
        const pc = new RTCPeerConnection(configuration);
        pcRef.current = pc;

        // 8a. 创建 DataChannel (用于接收眼动数据)
        const dataChannel = pc.createDataChannel("shared-data"); // 建议统一命名
        dataChannelRef.current = dataChannel;
        dataChannel.onopen = () => console.log("面试官：数据通道已开启!");
        dataChannel.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            // 确保只处理 'gaze' 类型的原始数据
            if (msg.type === 'gaze') {
                const { x, y, t } = msg.content;
                // 1. 渲染红点
                setGazePoint({ x, y, visible: true });
                // 2. 驱动 L1/L2 分析流程
                processGazeData(x, y, t);
            }
        };

        // 8b. WebRTC 配置
        pc.onicecandidate = (event) => {
            if (event.candidate) socketRef.current.emit('ice-candidate', event.candidate);
        };
        pc.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        // 8c. 获取媒体流
        try {
            const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = localStream; // 保存引用
            localVideoRef.current.srcObject = localStream;
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit('offer', pc.localDescription);
        } catch (err) {
            console.error("无法获取摄像头:", err);
            alert("无法获取摄像头权限，请检查设备设置。");
        }
    };

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        sessionStorage.setItem(`interview_code_${roomId}`, newCode);
        socketRef.current?.emit('code-update', newCode);
    };

    const handleQuestionChange = (e) => {
        const newQuestion = e.target.value;
        setQuestion(newQuestion);
        sessionStorage.setItem(`interview_question_${roomId}`, newQuestion);
        socketRef.current?.emit('question-update', newQuestion);
    };

    const runCode = () => {
        setExecutionResult('正在执行代码...');
        workerRef.current?.postMessage({ code });
    };

    const handleReturnToMenu = () => {
        // 发送离开房间的状态更新
        if (socketRef.current) {
            const leaveStatus = {
                id: Date.now(),
                type: 'info',
                message: '面试官已离开房间'
            };
            socketRef.current.emit('status-update', leaveStatus);
        }
        // 延迟导航，确保消息能够发送
        setTimeout(() => {
            navigate('/interviewer/home');
        }, 100);
    };

    // --- 9. 渲染 (JSX) ---
    return (
        <div className={styles.pageContainer}>
            {/* 眼动坐标红点 */}
            {gazePoint.visible && (
                <div 
                    className={styles.gazeDot} 
                    style={{ left: `${gazePoint.x}px`, top: `${gazePoint.y}px` }}
                ></div>
            )}
            
            {/* 侧边栏 */}
            <div className={styles.sidebar}>
                <h2>面试官端</h2>
                <video ref={localVideoRef} autoPlay playsInline muted className={styles.videoPlayer} />
                <video ref={remoteVideoRef} autoPlay playsInline className={styles.videoPlayer} />
                <button onClick={startCall} className={styles.callButton}>开始面试</button>

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

                {/* 实时行为面板 */}
                <h4>应聘者实时行为</h4>
                <div className={styles.behaviorPanel}>
                    {/* 使用动态的 behaviorClass 来控制颜色 */}
                    <p className={styles[behaviorClass] || ''}>
                        {intervieweeBehavior}
                    </p>
                </div>

                <button onClick={handleReturnToMenu} className={styles.button} style={{ marginTop: 'auto' }}>
                    离开面试
                </button>
            </div>

            {/* 主工作区 */}
            <div className={styles.mainWorkspace}>
                <div className={styles.questionColumn}>
                    <div className={styles.contentCard}>
                        <h4>问题区</h4>
                        <textarea
                            value={question}
                            onChange={handleQuestionChange}
                            placeholder="请将题目发布在这里..."
                            className={styles.questionEditor}
                        />
                    </div>
                </div>

                <div className={styles.codeResultColumn}>
                    <div className={`${styles.contentCard} ${styles.codeCard}`}>
                        <h4>代码区</h4>
                        <SharedCodeEditor code={code} onCodeChange={handleCodeChange} />
                        {/* 修复了空格问题 */}
                        <button onClick={runCode} className={`${styles.button} ${styles.runButton}`}>运行代码</button>
                    </div>
                    <div className={`${styles.contentCard} ${styles.resultCard}`}>
                        <h4>执行结果</h4>
                        <pre className={styles.resultBox}>{executionResult}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InterviewerContent;