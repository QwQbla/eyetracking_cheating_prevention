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

    // 获取面试任务列表
    const fetchInterviews = async () => {
        try {
            const response = await fetch(`${API_ENDPOINTS.itvTaskQuery}?mszsjh=${encodeURIComponent(userPhone)}`);
            const data = await response.json();
            
            if (response.ok) {
                const formattedInterviews = data.map(item => ({
                    id: item.msjlh,
                    interviewerPhone: item.ygsjh,
                    roomId: item.fjh,
                    startTime: item.kssj,
                    status: getInterviewStatus(item.kssj)
                }));
                setInterviews(formattedInterviews);
            }
        } catch (error) {
            toast.error('获取面试列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 进入面试房间
    const handleEnterRoom = (interview) => {
        const now = new Date();
        const start = new Date(interview.startTime);

        if (now < start) {
            toast.error('面试尚未开始');
            return;
        }
        navigate(`/interviewee/content?roomId=${interview.roomId}`);
    };

    useEffect(() => {
        fetchInterviews();
    }, [userPhone]);

    return (
        <div className="interviewee-home">
            <ToastContainer position="top-center" autoClose={3000} />
            
            <header className="header">
                <h1>基于眼动分析的防大语言模型作弊的面试系统</h1>
                <div className="header-buttons">
                    <RoleSwitcher currentRole="interviewee" />
                    <button className="user-center-btn" onClick={() => navigate('/interviewer/profile')}>
                        用户中心
                    </button>
                    <button className="logout-btn" onClick={() => navigate('/')}>
                        退出
                    </button>
                </div>
            </header>

            <main className="main-content">
                <div className="interview-list">
                    <h2>面试任务列表</h2>
                    {loading ? (
                        <div className="loading">加载中...</div>
                    ) : interviews.length === 0 ? (
                        <div className="no-data">暂无面试安排</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>房间号</th>
                                    <th>开始时间</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {interviews.map(interview => (
                                    <tr key={interview.id}>
                                        <td>{interview.roomId}</td>
                                        <td>{new Date(interview.startTime).toLocaleString()}</td>
                                        <td className={`status ${interview.status}`}>
                                            {interview.status}
                                        </td>
                                        <td>
                                            <button 
                                                className="enter-btn"
                                                onClick={() => handleEnterRoom(interview)}
                                                disabled={interview.status !== '进行中'}
                                            >
                                                进入
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