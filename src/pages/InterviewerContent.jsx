// InterviewerContent.jsx
import React, { useRef, useEffect, useState } from 'react';
import { useNavigate , useParams } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import RoleSwitcher from '../components/RoleSwitcher';
//import '../styles/InterviewerContent.css';
import styles from '../styles/SharedLayout.module.css';
import SharedCodeEditor from '../components/SharedCodeEditor'; 
import { io } from 'socket.io-client'; 

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const InterviewerContent = () => {
    const navigate = useNavigate();
    const userEmail = localStorage.getItem('email') || '';

    const { roomId } = useParams();

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const pcRef = useRef(null);
    const socketRef = useRef(null); 

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('userRole');
        navigate('/');
    };

    const [code, setCode] = useState(() => {
        const savedCode = sessionStorage.getItem(`interview_code_${roomId}`);
        return savedCode !== null ? savedCode : '// Type your code here...'; // 如果有存档，使用存档；否则用默认值
    });
    const [question, setQuestion] = useState(() => {
        const savedQuestion = sessionStorage.getItem(`interview_question_${roomId}`);
        return savedQuestion !== null ? savedQuestion : '请在这里输入题目...';
    });
  
    const [executionResult, setExecutionResult] = useState('');
    const workerRef = useRef(null);

    const dataChannelRef = useRef(null);
    const [gazePoint, setGazePoint] = useState({ x: -100, y: -100, visible: false });

    const [statusLog, setStatusLog] = useState([{
        id: Date.now(),
        type: 'system',
        message: '正在等待应聘者进入房间...'
    }]);

    const statusPanelRef = useRef(null);

    
    //用来处理自动滚动
    useEffect(() => {
        // 当 statusLog 数组发生变化时，这个 effect 就会执行
        if (statusPanelRef.current) {
            // 将滚动条滚动到最底部
            statusPanelRef.current.scrollTop = statusPanelRef.current.scrollHeight;
        }
    }, [statusLog]); // 依赖项是 statusLog

    useEffect(() => {
        workerRef.current = new Worker('/coderunner.js');
        workerRef.current.onmessage = (event) => {
            // 构造要在界面上显示的字符串
            const resultString = JSON.stringify(event.data, null, 2);

            // 通过 emit 发送原始数据对象给对方
            socketRef.current.emit('code-result', event.data);
            
            // 同时，也更新自己的执行结果状态
            setExecutionResult(resultString);
        };
        return () => workerRef.current.terminate();
    }, []);

    useEffect(() => {
        // 使用 io() 创建连接
        const socket = io('http://localhost:8080');
        socketRef.current = socket;
    
        // 使用 on('connect') 代替 onopen，并使用 emit 发送 join-room
        socket.on('connect', () => {
          console.log('面试官：信令服务器已连接', socket.id);
          socket.emit('join-room', roomId);
    
          const myStatus = {
              id: Date.now(),
              type: 'info',
              message: '面试官已进入房间'
          };
          socket.emit('status-update', myStatus); // 发送整个对象
          setStatusLog(prevLog => [...prevLog, myStatus]);
        });
    
        // 将 onmessage 的逻辑拆分到独立的事件监听器中
        socket.on('answer', async (answerSdp) => {
          console.log('面试官：收到 Answer, 设置远程描述...');
          if (pcRef.current && pcRef.current.signalingState !== 'stable') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answerSdp));
            console.log('面试官：远程描述设置成功');
          }
        });
    
        socket.on('ice-candidate', async (candidate) => {
          if (pcRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });
    
        socket.on('code-update', (newCode) => {
          setCode(newCode);
          sessionStorage.setItem(`interview_code_${roomId}`, newCode);
        });
        
        // 监听代码执行结果
        socket.on('code-result', (result) => {
          setExecutionResult(JSON.stringify(result, null, 2));
        });
    
        // 使用 socket.disconnect() 清理连接
        return () => {
          if (socket) socket.disconnect();
          if (pcRef.current) pcRef.current.close();
          // 停止本地视频流
          if (localVideoRef.current) {
            localVideoRef.current.getTracks().forEach(track => track.stop());
              console.log('面试官端摄像头已关闭');
          }
      };
      }, [roomId]);
    
      const startCall = async () => {
        console.log('面试官：开始呼叫流程...');
        const pc = new RTCPeerConnection(configuration);
        pcRef.current = pc;
    
            // --- DataChannel 核心逻辑 ---
    const dataChannel = pc.createDataChannel("gaze-data");
    dataChannelRef.current = dataChannel;
    dataChannel.onopen = () => console.log("面试官：数据通道已开启 (用于眼动数据)!");
    dataChannel.onmessage = (event) => {
        const receivedData = JSON.parse(event.data);
        if (receivedData.type === 'gaze') {
            setGazePoint({ x: receivedData.content.x, y: receivedData.content.y, visible: true });
        }
    };


    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // 使用 emit 发送 ice-candidate
        socketRef.current.emit('ice-candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      console.log('面试官：接收到远端媒体流');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = localStream;
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // 使用 emit 发送 offer
    socketRef.current.emit('offer', pc.localDescription);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    sessionStorage.setItem(`interview_code_${roomId}`, newCode); // 存储
    // 使用 emit 发送 code-update
    socketRef.current.emit('code-update', newCode);
  };

  const handleQuestionChange = (e) => {
    const newQuestion = e.target.value;
    setQuestion(newQuestion);
    sessionStorage.setItem(`interview_question_${roomId}`, newQuestion); // 存储
    if (socketRef.current) {
      socketRef.current.emit('question-update', newQuestion);
    }
  };

  const runCode = () => {
    setExecutionResult('正在执行代码...');
    workerRef.current.postMessage({ code });
  };
  
  
  const handleReturnToMenu = () => {
    navigate('/interviewer/home'); // 導航到主選單/首頁
  };



    return (

        <div className={styles.pageContainer}>
        {/* 眼动坐标 */}
        {gazePoint.visible && (
            <div 
                className={styles.gazeDot} 
                style={{ 
                    left: `${gazePoint.x}px`, 
                    top: `${gazePoint.y}px`,
                }}
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
  
          <button
            onClick={handleReturnToMenu}
            className={styles.button}
            style={{ width: '100%', marginBottom: '1rem' }} 
          >
            离开面试
          </button>
        </div>
        
        
        <div className={styles.mainWorkspace}>
  
          <div className={styles.questionColumn}>
            {/* Question Section */}
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
            {/* Code Section */}
            <div className={`${styles.contentCard} ${styles.codeCard}`}>
              <h4>代码区</h4>
              <SharedCodeEditor code={code} onCodeChange={handleCodeChange} />
              <button onClick={runCode}className={`${styles.button} ${styles.runButton}`}>运行代码</button>
            </div>
  
            {/* Results Section */}
            <div className={`${styles.contentCard} ${styles.resultCard}`}>
              <h4>执行结果</h4>
              <pre className={styles.resultBox}>
                {executionResult}
              </pre>
            </div>
          </div>
  
        </div>
  
      </div>


    );
};

export default InterviewerContent;