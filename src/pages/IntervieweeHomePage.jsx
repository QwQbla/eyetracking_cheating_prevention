//IntervieweeHomePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_ENDPOINTS } from '../api';
import '../styles/IntervieweeHomePage.css';
import RoleSwitcher from '../components/RoleSwitcher';

const IntervieweeHomePage = () => {
    const navigate = useNavigate();
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const userPhone = localStorage.getItem('phone') || '';
    const userEmail = localStorage.getItem('email') || '';
    let lastToastMessage = '';

    const debounceToast = (() => {
            let lastToastTime = 0;
            const debounceTime = 2000;
            
            return (message, options = {}) => {
                const now = Date.now();
                if (now - lastToastTime > debounceTime || message !== lastToastMessage) {
                    lastToastTime = now;
                    lastToastMessage = message;
                    toast(message, options);
                }
            };
        })();

    // 获取面试者参与的面试任务
    const fetchInterviews = async () => {
        try {
            setLoading(true);
            // 优先使用手机号查询，如果没有手机号则使用邮箱
            const identifier = userPhone || userEmail;
            const response = await fetch(`${API_ENDPOINTS.itvTaskQuery}?mszyxh=${encodeURIComponent(identifier)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success === false) {
                throw new Error(result.msg);
            }

            const formattedInterviews = result.data.map(item => ({
                id: item.msjlh,
                interviewerName: item.ygyxh, // 面试官信息
                roomId: item.fjh,
                startTime: item.kssj,
                endTime: item.jssj,
                status: getInterviewStatus(item.kssj, item.jssj),
                role: 'interviewee' // 标记为面试者参与的任务
            }));
            
            setInterviews(formattedInterviews);
        } catch (error) {
            console.error('获取面试列表失败:', error);
            debounceToast(`获取面试列表失败: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getInterviewStatus = (startTimeStr, endTimeStr) => {
        const now = new Date();
        const startTime = new Date(startTimeStr);
        const endTime = new Date(endTimeStr);
        
        if (now < startTime) return '未开始';
        if (now >= startTime && now <= endTime) return '进行中';
        return '已结束';
    };

    // 进入面试房间
    const handleEnterRoom = (interview) => {
        const now = new Date();
        const start = new Date(interview.startTime);
        const end = new Date(interview.endTime);

        if (now < start || now > end) {
            toast.error('不在面试时间范围内');
            return;
        }

        navigate(`/calibration/${interview.roomId}`);
    };

    useEffect(() => {
        // 设置用户角色为面试者
        localStorage.setItem('userRole', 'interviewee');
        // 检查用户角色，如果是面试官则重定向
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'interviewer') {
            navigate('/interviewer/home');
            return;
        }
        
        fetchInterviews();
        
        const interval = setInterval(() => {
            setInterviews(prev => prev.map(item => ({
                ...item,
                status: getInterviewStatus(item.startTime, item.endTime)
            })));
        }, 60000);

        return () => clearInterval(interval);
    }, [userPhone, userEmail, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('phone');
        localStorage.removeItem('email');
        localStorage.removeItem('userRole');
        navigate('/');
    };

    return (
        <div className="interviewee-home">
            <ToastContainer 
                position="top-center" 
                autoClose={2000} 
                hideProgressBar={true}//隐藏进度条
                pauseOnHover={false}//鼠标悬停不暂停
            />
            <header className="homepage-header">
                <h1>基于眼动分析的防大语言模型作弊的面试系统</h1>
                <div className="header-buttons">
                    <RoleSwitcher currentRole="interviewee" />
                    <button className="user-center-btn" onClick={() => navigate('/interviewee/profile')}>
                        用户中心
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        退出
                    </button>
                </div>
            </header>

            <main className="main-content">
                <div className="interview-list">
                    <h2>我的面试安排</h2>
                    {loading ? (
                        <div className="loading">加载中...</div>
                    ) : interviews.length === 0 ? (
                        <div className="no-data">暂无面试安排</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>面试官</th>
                                    <th>房间号</th>
                                    <th>开始时间</th>
                                    <th>结束时间</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {interviews.map(interview => (
                                    <tr key={interview.id}>
                                        <td>{interview.interviewerName}</td>
                                        <td>{interview.roomId}</td>
                                        <td>{new Date(interview.startTime).toLocaleString()}</td>
                                        <td>{new Date(interview.endTime).toLocaleString()}</td>
                                        <td className={`status ${interview.status}`}>
                                            {interview.status}
                                        </td>
                                        <td>
                                            <button 
                                                className="enter-btn"
                                                onClick={() => handleEnterRoom(interview)}
                                                disabled={interview.status !== '进行中'}
                                            >
                                                进入面试
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
};

export default IntervieweeHomePage;