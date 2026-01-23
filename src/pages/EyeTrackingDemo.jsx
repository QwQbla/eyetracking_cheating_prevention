import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- 辅助计算函数 (纯函数，放在组件外) ---
const calculateCentroid = (points) => {
    let sumX = 0, sumY = 0;
    for (const p of points) { sumX += p.x; sumY += p.y; }
    return { x: sumX / points.length, y: sumY / points.length };
};

const calculateAmplitude = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

const calculateDirection = (p1, p2) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle > -22.5 && angle <= 22.5) return 'Right';
    if (angle > 22.5 && angle <= 67.5) return 'Right-Down';
    if (angle > 67.5 && angle <= 112.5) return 'Down';
    if (angle > 112.5 && angle <= 157.5) return 'Left-Down';
    if (angle > 157.5 || angle <= -157.5) return 'Left';
    if (angle > -157.5 && angle <= -112.5) return 'Left-Up';
    if (angle > -112.5 && angle <= -67.5) return 'Up';
    if (angle > -67.5 && angle <= -22.5) return 'Right-Up';
    return 'Unknown';
};

// --- 常量配置 ---
const WINDOW_DURATION_MS = 150;
const FIXATION_MIN_DURATION_MS = 5;
const FIXATION_MAX_DURATION_MS = 10000;
const SACCADE_MIN_AMPLITUDE_PX = 5;
const SACCADE_MAX_AMPLITUDE_PX = 2000;
const GLOBAL_DECAY_INTERVAL_MS = 100;

// 奖励/惩罚常量
const FORWARD_BONUS = 0.4;
const REGRESSION_BONUS = 0.3;
const WEAK_MATCH_BONUS = 0.15;

const EyeTrackingDemo = () => {
    // --- Refs (用于高性能 DOM 操作和状态保持) ---
    // UI Refs
    const gazeDotRef = useRef(null);
    const dispersionBoxRef = useRef(null);
    const confBarRef = useRef(null);
    const confValRef = useRef(null);
    const confStatusRef = useRef(null);
    const logicLogRef = useRef(null);
    const absCoordsRef = useRef(null);
    const normCoordsRef = useRef(null);
    const eventTypeRef = useRef(null);
    const eventDurationRef = useRef(null);
    const resultBoxRef = useRef(null);

    // Logic Refs (替代全局变量)
    const paramsRef = useRef({
        dispersionThreshold: 100,
        modifierRate: 0.15,
        confidenceThreshold: 0.55
    });
    
    // State Machine Refs
    const stateRef = useRef({
        currentState: 'IDLE',
        currentEventPoints: [],
        currentEventStartTime: null,
        gazeWindow: [],
        readingConfidence: 0.0,
        eventHistory: []
    });

    const timerRef = useRef(null);

    // React State (仅用于低频更新，如初始加载状态)
    const [statusText, setStatusText] = useState("正在加载 Webgazer...");
    const [isLoaded, setIsLoaded] = useState(false);

    // --- 核心逻辑类逻辑 (迁移至 Hook/Ref 内部) ---
    const updateConfidenceDisplay = useCallback(() => {
        const { readingConfidence } = stateRef.current;
        const { confidenceThreshold } = paramsRef.current;
        
        if (!confBarRef.current) return;

        const percentage = Math.min(100, Math.max(0, readingConfidence * 100));
        confBarRef.current.style.width = `${percentage}%`;
        
        const color = readingConfidence > confidenceThreshold ? '#4CAF50' : (readingConfidence > confidenceThreshold * 0.5 ? '#FFC107' : '#F44336');
        confBarRef.current.style.backgroundColor = color;
        
        if (confValRef.current) {
            confValRef.current.textContent = readingConfidence.toFixed(3);
            confValRef.current.style.color = color;
        }
        if (confStatusRef.current) {
            confStatusRef.current.textContent = readingConfidence > confidenceThreshold ? '阅读中' : '非阅读';
            confStatusRef.current.style.color = readingConfidence > confidenceThreshold ? '#4CAF50' : '#aaa';
        }
    }, []);

    const decayConfidence = useCallback(() => {
        const { readingConfidence } = stateRef.current;
        const { modifierRate } = paramsRef.current;
        
        if (readingConfidence > 0) {
            stateRef.current.readingConfidence = Math.max(0.0, readingConfidence - modifierRate);
            updateConfidenceDisplay();
        }
    }, [updateConfidenceDisplay]);

    const increaseConfidence = useCallback((amount) => {
        stateRef.current.readingConfidence = Math.min(1.0, stateRef.current.readingConfidence + amount);
        updateConfidenceDisplay();
    }, [updateConfidenceDisplay]);

    const evaluateReadingPattern = useCallback(() => {
        const history = stateRef.current.eventHistory;
        const lastFix = history[history.length - 1];
        const lastSac = history[history.length - 2];
        
        let logMsg = "";
        let color = "#aaa";

        if (!lastFix || !lastSac || lastSac.type !== 'Saccade') {
            logMsg = "Wait...";
        } else {
            const rule1_Duration = lastFix.duration > FIXATION_MIN_DURATION_MS && lastFix.duration < FIXATION_MAX_DURATION_MS;
            const isRightward = ['Right', 'Right-Down', 'Right-Up'].includes(lastSac.direction);
            const isLeftward = ['Left', 'Left-Down', 'Left-Up'].includes(lastSac.direction);
            const isForwardAmp = lastSac.amplitude > SACCADE_MIN_AMPLITUDE_PX && lastSac.amplitude < SACCADE_MAX_AMPLITUDE_PX;
            
            if (rule1_Duration && isRightward && isForwardAmp) {
                increaseConfidence(FORWARD_BONUS);
                logMsg = `✅ 正向 (Amp:${Math.round(lastSac.amplitude)})`;
                color = "#4CAF50";
            } else if (rule1_Duration && isLeftward && isForwardAmp) {
                increaseConfidence(REGRESSION_BONUS);
                logMsg = `↩️ 回读 (Amp:${Math.round(lastSac.amplitude)})`;
                color = "#FFC107";
            } else if (isRightward && isForwardAmp) {
                increaseConfidence(WEAK_MATCH_BONUS);
                logMsg = `⚠️ 弱匹配`;
                color = "orange";
            } else {
                logMsg = `❌ ${lastSac.direction} A:${Math.round(lastSac.amplitude)}`;
                color = "#F44336";
            }
        }

        const time = new Date().toLocaleTimeString().split(' ')[0];
        if (logicLogRef.current) {
            const newLog = `<div style="color:${color}">[${time}] ${logMsg} (Conf: ${stateRef.current.readingConfidence.toFixed(2)})</div>`;
            logicLogRef.current.innerHTML = newLog + logicLogRef.current.innerHTML;
        }
    }, [increaseConfidence]);

    const addEvent = useCallback((event) => {
        const { eventHistory } = stateRef.current;
        eventHistory.push(event);
        if (eventHistory.length > 20) eventHistory.shift();

        if (event.type === 'Fixation') {
            evaluateReadingPattern();
        }

        const isReading = stateRef.current.readingConfidence > paramsRef.current.confidenceThreshold;
        if (resultBoxRef.current) {
            resultBoxRef.current.textContent = isReading ? '阅读 (Reading)' : '非阅读 (Browsing)';
            resultBoxRef.current.style.backgroundColor = isReading ? 'rgba(76, 175, 80, 0.15)' : '#eee';
            resultBoxRef.current.style.color = isReading ? '#4CAF50' : '#777';
        }
    }, [evaluateReadingPattern]);

    // --- 状态机与WebGazer逻辑 ---

    const updateCurrentEventDisplay = useCallback((state, duration = 0) => {
        if (!eventTypeRef.current || !eventDurationRef.current) return;
        
        if (state === 'FIXATING') {
            eventTypeRef.current.textContent = '👁️ 注视 (Fixation)';
            eventTypeRef.current.style.color = '#4CAF50';
            eventTypeRef.current.style.background = 'rgba(76, 175, 80, 0.2)';
        } else if (state === 'SACCADING') {
            eventTypeRef.current.textContent = '⚡ 眼跳 (Saccade)';
            eventTypeRef.current.style.color = '#FFC107';
            eventTypeRef.current.style.background = 'rgba(255, 193, 7, 0.2)';
        } else {
            eventTypeRef.current.textContent = '等待中...';
            eventTypeRef.current.style.color = '#aaa';
            eventTypeRef.current.style.background = '#333';
        }
        eventDurationRef.current.textContent = Math.round(duration);
    }, []);

    const finalizeAndSubmitEvent = useCallback((eventType, points) => {
        if (points.length === 0) return;
        const startTime = points[0].timestamp;
        const endTime = points[points.length - 1].timestamp;
        const duration = endTime - startTime;
        let eventObject;

        if (eventType === 'FIXATING') {
            if (duration < FIXATION_MIN_DURATION_MS) return;
            const centroid = calculateCentroid(points);
            eventObject = { type: 'Fixation', startTime, endTime, duration, centroid, pointsCount: points.length };
            updateCurrentEventDisplay('FIXATING', duration);
        } else {
            if (duration < 10) return;
            const startPoint = { x: points[0].x, y: points[0].y };
            const endPoint = { x: points[points.length - 1].x, y: points[points.length - 1].y };
            const amplitude = calculateAmplitude(startPoint, endPoint); 
            if (amplitude < SACCADE_MIN_AMPLITUDE_PX) return;
            const direction = calculateDirection(startPoint, endPoint);
            eventObject = { type: 'Saccade', startTime, endTime, duration, startPoint, endPoint, amplitude, direction };
            updateCurrentEventDisplay('SACCADING', duration);
        }

        if (eventObject) {
            addEvent(eventObject);
        }
    }, [addEvent, updateCurrentEventDisplay]);

    const updateFiniteStateMachine = useCallback((point, classification) => {
        const { currentState, currentEventStartTime } = stateRef.current;
        const newState = (classification === 'Fixation') ? 'FIXATING' : 'SACCADING';

        if (currentState === 'IDLE') {
            stateRef.current.currentState = newState;
            stateRef.current.currentEventPoints.push(point);
            stateRef.current.currentEventStartTime = point.timestamp;
            updateCurrentEventDisplay(newState, 0);
            return;
        }

        if (newState === currentState) {
            stateRef.current.currentEventPoints.push(point);
            if (currentEventStartTime) {
                const duration = point.timestamp - currentEventStartTime;
                updateCurrentEventDisplay(currentState, duration);
            }
            return;
        }

        finalizeAndSubmitEvent(currentState, stateRef.current.currentEventPoints);
        
        stateRef.current.currentState = newState;
        stateRef.current.currentEventPoints = [point];
        stateRef.current.currentEventStartTime = point.timestamp;
        updateCurrentEventDisplay(newState, 0);
    }, [finalizeAndSubmitEvent, updateCurrentEventDisplay]);

    const classifyPoint = useCallback((point) => {
        const { gazeWindow } = stateRef.current;
        gazeWindow.push(point);
        
        // 维持时间窗口
        while (gazeWindow.length > 0 && gazeWindow[0].timestamp < (point.timestamp - WINDOW_DURATION_MS)) {
            gazeWindow.shift();
        }

        if (gazeWindow.length > 0) {
            let minX = gazeWindow[0].x, maxX = gazeWindow[0].x;
            let minY = gazeWindow[0].y, maxY = gazeWindow[0].y;
            
            for (const p of gazeWindow) {
                if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
            }

            // 更新可视化方框 (直接DOM操作)
            if (dispersionBoxRef.current) {
                dispersionBoxRef.current.style.left = minX + 'px';
                dispersionBoxRef.current.style.top = minY + 'px';
                dispersionBoxRef.current.style.width = Math.max(2, maxX - minX) + 'px';
                dispersionBoxRef.current.style.height = Math.max(2, maxY - minY) + 'px';
                dispersionBoxRef.current.style.display = 'block';
            }

            const dispersion = (maxX - minX) + (maxY - minY);
            const { dispersionThreshold } = paramsRef.current;

            if (dispersion <= dispersionThreshold) {
                if (dispersionBoxRef.current) {
                    dispersionBoxRef.current.style.borderColor = '#4CAF50';
                    dispersionBoxRef.current.style.boxShadow = '0 0 5px #4CAF50';
                }
                return 'Fixation';
            } else {
                if (dispersionBoxRef.current) {
                    dispersionBoxRef.current.style.borderColor = '#F44336';
                    dispersionBoxRef.current.style.boxShadow = 'none';
                }
                return 'Saccade';
            }
        }
        return 'Saccade';
    }, []);

    const handleGazeData = useCallback((data, elapsedTime) => {
        if (data == null) return;
        const point = { x: data.x, y: data.y, timestamp: Date.now() };

        // 1. 更新 Gaze Dot
        if (gazeDotRef.current) {
            gazeDotRef.current.style.left = `${point.x}px`;
            gazeDotRef.current.style.top = `${point.y}px`;
            gazeDotRef.current.style.display = 'block';
        }

        // 2. 更新坐标面板
        if (absCoordsRef.current) {
            absCoordsRef.current.textContent = `(${Math.round(point.x)}, ${Math.round(point.y)})`;
        }
        if (normCoordsRef.current) {
            const nx = point.x / window.innerWidth;
            const ny = point.y / window.innerHeight;
            normCoordsRef.current.textContent = `(${nx.toFixed(3)}, ${ny.toFixed(3)})`;
        }

        // 3. 运行分类器和状态机
        const classification = classifyPoint(point);
        updateFiniteStateMachine(point, classification);

    }, [classifyPoint, updateFiniteStateMachine]);

    // --- 生命周期管理 ---
    useEffect(() => {
        // 动态加载 WebGazer 脚本
        const loadScript = () => {
            if (window.webgazer) {
                initWebGazer();
                return;
            }
            const script = document.createElement('script');
            script.src = "https://webgazer.cs.brown.edu/webgazer.js";
            script.async = true;
            script.onload = initWebGazer;
            document.body.appendChild(script);
        };

        const initWebGazer = async () => {
            try {
                if(!window.webgazer) {
                    console.error("Webgazer not found");
                    return;
                }
                
                // 清理旧实例 (React StrictMode 可能会导致两次调用)
                await window.webgazer.end(); 
                
                setStatusText("正在启动摄像头...");
                
                await window.webgazer.setRegression('weightedRidge')
                    .applyKalmanFilter(true)
                    .setTracker('clmtrackr') // 或者 'TFFacemesh' 如果你需要更高精度
                    .begin();

                window.webgazer.showVideo(false);
                window.webgazer.showFaceOverlay(false);
                window.webgazer.showPredictionPoints(false);
                window.webgazer.setGazeListener(handleGazeData);

                setStatusText("校准中... (请点击屏幕上的点进行校准)");
                setIsLoaded(true);
                
                // 启动置信度衰减定时器
                timerRef.current = setInterval(decayConfidence, GLOBAL_DECAY_INTERVAL_MS);

            } catch (err) {
                console.error("Webgazer Init Error:", err);
                setStatusText("错误：无法启动摄像头，请检查权限。");
            }
        };

        loadScript();

        // Cleanup
        return () => {
            if (window.webgazer) {
                window.webgazer.end();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [handleGazeData, decayConfidence]);


    // --- 样式定义 ---
    const styles = {
        container: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            width: '100vw',
            margin: 0,
            backgroundColor: '#f0f0f0',
            overflow: 'hidden',
            position: 'relative'
        },
        debugPanel: {
            position: 'fixed', top: '10px', right: '10px', width: '300px',
            background: 'rgba(0,0,0,0.85)', color: 'white', padding: '15px',
            borderRadius: '8px', fontSize: '12px', zIndex: 9999,
            fontFamily: 'monospace', textAlign: 'left'
        },
        dispersionBox: {
            position: 'fixed', // 使用 fixed 避免滚动影响
            border: '2px dashed rgba(0, 255, 255, 0.5)',
            pointerEvents: 'none', display: 'none', zIndex: 9998
        },
        statusBox: {
            position: 'absolute', top: '20px', padding: '10px 20px',
            background: '#fff', borderRadius: '8px',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
            fontSize: '1.1em', color: '#333', zIndex: 100
        },
        resultBox: {
            fontSize: '2.5em', fontWeight: 'bold', padding: '40px',
            borderRadius: '20px', width: '500px', textAlign: 'center',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            backgroundColor: '#eee', color: '#777'
        },
        gazeDot: {
            position: 'fixed', width: '20px', height: '20px',
            background: 'rgba(255, 0, 0, 0.5)', borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.7)',
            display: 'none', pointerEvents: 'none', zIndex: 99
        },
        sampleText: {
            position: 'absolute', top: '150px', left: '20px', width: '30%',
            background: '#fff', padding: '15px', borderRadius: '8px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)', color: '#333',
            lineHeight: '1.6', fontSize: '1.1em', textAlign: 'left'
        }
    };

    return (
        <div style={styles.container}>
            {/* 调试面板 */}
            <div style={styles.debugPanel}>
                <h3 style={{marginTop:0, borderBottom:'1px solid #555', paddingBottom:'5px', color: '#4CAF50'}}>
                    👁️ 算法调试器
                </h3>
                
                <div style={{marginBottom: '15px'}}>
                    <label>离散度阈值 (Dispersion): <strong style={{color: '#00BCD4', fontSize:'1.2em'}}>{paramsRef.current.dispersionThreshold}</strong> px</label>
                    <input type="range" min="10" max="300" defaultValue="100" 
                        style={{width:'100%', cursor: 'pointer'}}
                        onChange={(e) => {
                            paramsRef.current.dispersionThreshold = Number(e.target.value);
                            e.target.previousSibling.lastChild.textContent = e.target.value;
                        }}
                    />
                    <div style={{color: '#888', fontSize: '10px'}}>如果不动时红框变绿，说明阈值合适</div>
                </div>

                <div style={{marginBottom: '15px'}}>
                    <label>加分/扣分力度 (Rate): <strong style={{color: '#00BCD4'}}>{paramsRef.current.modifierRate}</strong></label>
                    <input type="range" min="0.01" max="0.5" step="0.01" defaultValue="0.15" 
                         style={{width:'100%', cursor: 'pointer'}}
                         onChange={(e) => {
                            paramsRef.current.modifierRate = Number(e.target.value);
                            e.target.previousSibling.lastChild.textContent = e.target.value;
                         }}
                    />
                </div>

                <div style={{marginBottom: '10px', borderTop:'1px solid #555', paddingTop:'10px'}}>
                    <strong style={{color: '#00BCD4'}}>📍 眼动坐标</strong>
                    <div style={{marginTop: '5px'}}>
                        <div style={{color: '#aaa', fontSize: '11px'}}>绝对坐标 (px):</div>
                        <div ref={absCoordsRef} style={{color: '#4CAF50', fontWeight: 'bold', fontSize: '13px'}}>(0, 0)</div>
                    </div>
                    <div style={{marginTop: '8px'}}>
                        <div style={{color: '#aaa', fontSize: '11px'}}>归一化坐标 (0-1):</div>
                        <div ref={normCoordsRef} style={{color: '#FFC107', fontWeight: 'bold', fontSize: '13px'}}>(0.00, 0.00)</div>
                    </div>
                </div>

                <div style={{marginBottom: '10px', borderTop:'1px solid #555', paddingTop:'10px'}}>
                    <strong style={{color: '#00BCD4'}}>👁️ 当前事件类型</strong>
                    <div style={{marginTop: '8px'}}>
                        <div ref={eventTypeRef} style={{textAlign:'center', fontWeight:'bold', fontSize: '16px', padding: '8px', borderRadius: '6px', background: '#333', color: '#aaa'}}>
                            等待中...
                        </div>
                        <div style={{color: '#888', fontSize: '10px', textAlign:'center', marginTop:'5px'}}>
                            持续时间: <span ref={eventDurationRef}>0</span> ms
                        </div>
                    </div>
                </div>

                <div style={{marginBottom: '10px', borderTop:'1px solid #555', paddingTop:'10px'}}>
                    <strong style={{color: '#4CAF50'}}>📊 实时阅读置信度</strong>
                    <div style={{marginTop: '8px'}}>
                        <div style={{background:'#333', height:'16px', borderRadius:'8px', overflow:'hidden', marginTop: '5px'}}>
                            <div ref={confBarRef} style={{width: '0%', height:'100%', background: '#4CAF50', transition: 'width 0.2s ease-out'}}></div>
                        </div>
                        <div ref={confValRef} style={{textAlign:'center', marginTop:'5px', fontWeight:'bold', fontSize: '16px', color: '#4CAF50'}}>0.00</div>
                        <div style={{color: '#888', fontSize: '10px', textAlign:'center', marginTop:'3px'}}>
                            阈值: <span>{paramsRef.current.confidenceThreshold}</span> | 当前状态: <span ref={confStatusRef} style={{color: '#aaa'}}>等待中</span>
                        </div>
                    </div>
                </div>

                <div style={{borderTop:'1px solid #555', paddingTop:'5px', marginTop: '10px'}}>
                    <strong>最近一次判定逻辑:</strong>
                    <div ref={logicLogRef} style={{color: '#ddd', height: '60px', overflow: 'hidden', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4'}}>Waiting for data...</div>
                </div>
            </div>

            {/* 可视化层 */}
            <div ref={dispersionBoxRef} style={styles.dispersionBox}></div>
            <div ref={gazeDotRef} style={styles.gazeDot}></div>
            
            {/* 状态与结果 */}
            <div style={styles.statusBox}>{statusText}</div>
            <div ref={resultBoxRef} style={styles.resultBox}>等待数据...</div>

            {/* 阅读材料 */}
            <div style={styles.sampleText}>
                <h4>在此测试阅读行为：</h4>
                <p>Webgazer.js 是一个眼动追踪库，它使用网络摄像头实时推断用户在屏幕上的注视位置。</p>
                <p>它使用现代网络浏览器中常见的网络摄像头馈送，并在浏览器中本地运行，因此视频数据不会离开用户的计算机。</p>
                <p>I-DT 是一种基于离散度的算法，用于区分注视和眼跳。</p>
                <p>通过分析这些事件的序列，我们可以尝试识别更高级的模式，例如阅读。</p>
                <p><strong>请尝试从左到右阅读这里的文字。</strong></p>
            </div>

            <div style={{position: 'absolute', bottom: '20px', color: '#555', fontSize: '0.9em', maxWidth: '80%', textAlign: 'center'}}>
                请允许摄像头访问。然后在屏幕上随机点击几个点并注视它们来进行校准。<br/>
                校准后，尝试阅读左侧的示例文本，同时拖动右上角的滑块调整参数。
            </div>
        </div>
    );
};

export default EyeTrackingDemo;