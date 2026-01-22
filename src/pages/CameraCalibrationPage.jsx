// src/pages/CameraCalibrationPage.jsx
// --- 相关库 ----
import React, { useEffect, useState, useRef, useCallback } from 'react';
import webgazer from 'webgazer';
import swal from 'sweetalert';
import { useNavigate , useParams} from 'react-router-dom'; 
// --- CSS 文件 ----
import '../styles/CameraCalibrationPage.css';
import '../styles/CalibrationPoints.css'; // 校准点样式
import '../styles/IntervieweeContent.css';
// --- 组件 ----
import CalibrationPoints from '../components/CalibrationPoints';
import HelpModal from '../components/HelpModal';
import { useWebgazer } from '../hooks/useWebgazer';
// --- API ----
import { API_ENDPOINTS } from '../api';


// --- 用于校准序列的常量 ---
// 定义校准点的顺时针顺序，不包括中心点。
const CALIBRATION_SEQUENCE = ['Pt1', 'Pt2', 'Pt3', 'Pt6', 'Pt9', 'Pt8', 'Pt7', 'Pt4'];
const TOTAL_CYCLES = 3;
const TOTAL_STEPS = CALIBRATION_SEQUENCE.length * TOTAL_CYCLES;

/**
 * 精确度计算相关函数 
 */
// 暂停指定毫秒数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// 计算眼动追踪器的预测准确性
function calculatePrecision(past50Array) {
    if (!past50Array || past50Array.length === 0) return 0;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const x50 = past50Array[0];
    const y50 = past50Array[1];
    const staringPointX = windowWidth / 2;
    const staringPointY = windowHeight / 2;
    const precisionPercentages = new Array(50);
    for (let i = 0; i < 50; i++) {
        const xDiff = staringPointX - x50[i];
        const yDiff = staringPointY - y50[i];
        const distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));
        const halfWindowHeight = windowHeight / 2;
        let precision = 0;
        if (distance <= halfWindowHeight && distance >= 0) {
            precision = 100 - (distance / halfWindowHeight * 100);
        } else if (distance > halfWindowHeight) {
            precision = 0;
        } else {
            precision = 100;
        }
        precisionPercentages[i] = precision;
    }
    let totalPrecision = 0;
    for (let i = 0; i < 50; i++) {
        totalPrecision += precisionPercentages[i];
    }
    return Math.round(totalPrecision / 50);
}

function store_points_variable() {
    if (webgazer.params) webgazer.params.storingPoints = true;
}
function stop_storing_points_variable() {
    if (webgazer.params) webgazer.params.storingPoints = false;
}
// --- CameraCalibrationPage 组件 ----
function CameraCalibrationPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { status, initializeWebgazer } = useWebgazer();
    // --- 状态定义 ---
    const [accuracy, setAccuracy] = useState(null);
    const [showCalibrationButtons, setShowCalibrationButtons] = useState(false);
    const [modalShow, setModalShow] = useState(true);
    // --- 用于管理校准流程的新状态 ---
    const [calibrationStep, setCalibrationStep] = useState(0); // 跟踪当前步骤 (0 到 24)
    const [activePointId, setActivePointId] = useState(null); // 当前可见点的 ID
    const [showAccuracyPoint, setShowAccuracyPoint] = useState(false); 
    // --- Refs 定义 ---
    const plottingCanvasRef = useRef(null);
    //const helpModalRef = useRef(null);
    const calibrationClickDataRef = useRef([]); // 用于收集校准点击数据

    // --- 辅助函数 ---
    useEffect(() => {
      // 只有在 WebGazer 未准备好时才进行初始化
      if (!status.isReady) {
        initializeWebgazer();
      }
    }, [initializeWebgazer, status.isReady]);

    const ClearCanvas = useCallback(() => {
        const canvas = plottingCanvasRef.current;
        if (canvas) {
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }
    }, []);

    const ClearCalibration = useCallback(() => {
        setCalibrationStep(0);
        setActivePointId(CALIBRATION_SEQUENCE[0]);
        setAccuracy(null);
        calibrationClickDataRef.current = []; // 清空校准点击数据
    }, []);

    const ShowCalibrationPoint = useCallback(() => {
        setShowCalibrationButtons(true);
        setActivePointId(CALIBRATION_SEQUENCE[0]);
    }, []);

    const PopUpInstruction = useCallback(() => {
        ClearCanvas();
        swal({
            title: "校准",
            text: "请按照提示顺序点击校准点并在点击过程中保证您正在注视该点。我们将根据这些数据预测您的眼球运动。",
            buttons: { cancel: false, confirm: true }
        }).then(isConfirm => {
            if (isConfirm) {
                ShowCalibrationPoint();
            }
        });
    }, [ClearCanvas, ShowCalibrationPoint]);
/*
    const helpModalShow = useCallback(() => {
        if (helpModalRef.current) {
            helpModalRef.current.show();
        }
    }, []);*/


    const calcAccuracy = useCallback(() => {
        swal({
            title: "正在计算测量结果",
            text: "请不要移动鼠标，并凝视中心点5秒钟。我们将计算预测模型的精确度。",
            closeOnEsc: false,
            allowOutsideClick: false,
            closeModal: true
        }).then(async () => {
            setActivePointId(null);
            setShowCalibrationButtons(false);


            setShowAccuracyPoint(true);

            store_points_variable();
            await sleep(5000);
            stop_storing_points_variable();

            setShowAccuracyPoint(false);
            
            const past50 = webgazer.getStoredPoints();
            const precision_measurement = calculatePrecision(past50);
            setAccuracy(precision_measurement);

            swal({
                title: precision_measurement > 60 ? "您已经校准成功" : `您的精度测量结果为 ${precision_measurement}%,精度过低，需要重新校准。`,
                allowOutsideClick: false,
                buttons: {
                    cancel: precision_measurement > 60 ? false : "重新校准",
                    confirm: true
                }
            }).then(async (isConfirm) => {
                if (precision_measurement > 60 && isConfirm) {
                    // 校准成功，上传校准点击数据
                    if (calibrationClickDataRef.current.length > 0) {
                        try {
                            const response = await fetch(API_ENDPOINTS.gazeData, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    fjh: roomId, // 房间号 (fjh)
                                    time: new Date().toISOString(),
                                    zuobiao: calibrationClickDataRef.current
                                })
                            });

                            if (!response.ok) {
                                console.error('发送校准点击数据失败:', response.statusText);
                            } else {
                                const result = await response.json();
                                console.log('校准点击数据上传成功:', result);
                            }
                        } catch (error) {
                            console.error('网络错误，发送校准点击数据失败:', error);
                        }
                    }

                    setShowCalibrationButtons(false);
                    setActivePointId(null);
                    ClearCanvas();
                    swal("成功！", "即将进入面试房间...", "success", { 
                        timer: 1500, 
                        allowOutsideClick: false,
                        buttons: false 
                    })
                    .then(() => {
                        //console.log("校准成功，移除鼠标监听器...");
                        if (window.webgazer) {
                            window.webgazer.removeMouseEventListeners();
                        }
                        navigate(`/interviewee/content/${roomId}`);
                    });
                } else {
                    webgazer.clearData();
                    ClearCalibration();
                    PopUpInstruction();
                }
            });
        });
    }, [ClearCanvas, ClearCalibration, PopUpInstruction, navigate, roomId]);


    // --- 处理校准点点击事件的逻辑 ---
    const handleCalPointClick = useCallback((e) => {
        const clickedId = e.target.id;

        if (clickedId !== activePointId) {
            return;
        }

        // 收集点击数据：将 clientX/clientY 转换为归一化坐标 (0.0 - 1.0)
        const normalizedX = e.clientX / window.innerWidth;
        const normalizedY = e.clientY / window.innerHeight;
        const timestamp = Date.now();

        calibrationClickDataRef.current.push({
            x: normalizedX,
            y: normalizedY,
            timestamp: timestamp,
            dataType: 'calibration_click'
        });

        if (clickedId === 'Pt5') {
            //console.log("最终校准点 ('Pt5') 被点击。");
            setActivePointId(null);
            calcAccuracy();
            return;
        }

        const nextStep = calibrationStep + 1;

        if (nextStep < TOTAL_STEPS) {
            setCalibrationStep(nextStep);
            const nextPointId = CALIBRATION_SEQUENCE[nextStep % CALIBRATION_SEQUENCE.length];
            setActivePointId(nextPointId);
            //console.log(`步骤 ${nextStep}/${TOTAL_STEPS}. 下一个点: ${nextPointId}`);
        } else {
            //console.log("所有3轮循环已完成，显示中心点。");
            setCalibrationStep(nextStep);
            setActivePointId('Pt5');
        }
    }, [activePointId, calibrationStep, calcAccuracy]); // calcAccuracy 现在可以被安全地引用


    const handleStartCalibration = useCallback(() => {
        //console.log("4. handleStartCalibration 函数被成功调用 (在父组件中)"); 
        webgazer.clearData();
        ClearCalibration();
        ShowCalibrationPoint();
      }, [ClearCalibration, ShowCalibrationPoint]);


      if (!status.isReady) {
        return (
            <div className="calibration-page-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div> 
                    <p>{status.message}</p>
                </div>
            </div>
        );
    }
    //console.log('父组件状态 - modalShow:', modalShow); 
    // UI 
    return (
        <div className="calibration-page-container blog-page-container">
            <header className="homepage-header">
                <h1>基于眼动分析的防大语言模型作弊的面试系统</h1>
                <div className="header-buttons">
                    <div className="status-text">
                        {accuracy !== null ? `精度 | ${accuracy}%` : "目前尚未校准"}
                    </div>
                </div>
            </header>
            
            <canvas ref={plottingCanvasRef} id="plotting_canvas" className="webgazer-canvas"></canvas>

            {showAccuracyPoint && <div className="accuracy-point"></div>}
            
            <CalibrationPoints
                show={showCalibrationButtons}
                onClick={handleCalPointClick}
                activePointId={activePointId}
            />
            
            <HelpModal
                show={modalShow}
                onHide={() => setModalShow(false)}
                onCalibrateClick={handleStartCalibration}
            />
        </div>
    );
}

export default CameraCalibrationPage;