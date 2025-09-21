import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_ENDPOINTS } from '../api';
import '../styles/InterviewerHomePage.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import RoleSwitcher from '../components/RoleSwitcher';

const InterviewerHome = () => {
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [intervieweeEmail, setIntervieweeEmail] = useState(''); // 改为邮箱
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState(localStorage.getItem('email') || '');
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(() => {
    const initialEndTime = new Date();
    initialEndTime.setHours(initialEndTime.getHours() + 1); // 默认开始时间 +1 小时
    return initialEndTime;
    });


    const fetchInterviews = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_ENDPOINTS.empTaskQuery}?ygyxh=${encodeURIComponent(userEmail)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success === false) {
                throw new Error(result.msg);
            }

            const formattedInterviews = result.data.map(item => ({
                id: item.msjlh,
                intervieweeName: item.mszxm,
                intervieweeEmail: item.mszsjh, // 改为邮箱
                roomId: item.fjh,
                startTime: item.kssj,
                endTime: item.jssj,
                status: getInterviewStatus(item.kssj, item.jssj)
            }));
            
            setInterviews(formattedInterviews);
        } catch (error) {
            console.error('获取面试列表失败:', error);
            toast.error(`获取面试列表失败: ${error.message}`);
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

    useEffect(() => {
        fetchInterviews();
        
        const interval = setInterval(() => {
            setInterviews(prev => prev.map(item => ({
                ...item,
                status: getInterviewStatus(item.startTime, item.endTime)
            })));
        }, 60000);

        return () => clearInterval(interval);
    }, [userEmail]); 

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        navigate('/');
    };

    const handleCreateInterview = async () => {
        if (!intervieweeEmail || !startTime) {
            toast.error('请填写完整信息');
            return;
        }

        if (startTime >= endTime) {
            toast.error('结束时间必须晚于开始时间');
            return;
        }

        // 验证邮箱格式
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(intervieweeEmail)) {
            toast.error('请输入有效的面试者邮箱地址');
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.empTaskInsert, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ygyxh: userEmail,
                    mszyxh: intervieweeEmail, // 改为邮箱
                    kssj: startTime.toISOString(),
                    jssj: endTime.toISOString()
                }),
            });

            const result = await response.json();
            if (response.ok && result.success) {
                toast.success('面试创建成功');
                setShowCreateModal(false);
                setIntervieweeEmail(''); // 清空输入框
                fetchInterviews();
            } else {
                toast.error(result.msg || '创建面试失败');
            }
        } catch (error) {
            toast.error('网络错误，请稍后重试');
        }
    };

    const handleEnterRoom = (interview) => {
        const now = new Date();
        const start = new Date(interview.startTime);
        const end = new Date(interview.endTime);

        if (now < start || now > end) {
            toast.error('不在面试时间范围内');
            return;
        }

        navigate(`/interviewer/content?roomId=${interview.roomId}`);
    };

    const handleDeleteInterview = async (intervieweeEmail) => {
        try {
            const response = await fetch(API_ENDPOINTS.empTaskDelete, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ygyxh: userEmail,
                    mszyxh: intervieweeEmail // 改为邮箱
                }),
            });

            const result = await response.json();
            if (response.ok && result.success) {
                toast.success('删除成功');
                fetchInterviews();
            } else {
                toast.error(result.msg || '删除失败');
            }
        } catch (error) {
            toast.error('网络错误，请稍后重试');
        }
    };

    const handleStartTimeChange = (date) => {
    setStartTime(date);
    // 如果新开始时间晚于当前结束时间，则自动调整结束时间（例如 +1 小时）
    if (date >= endTime) {
        const newEndTime = new Date(date);
        newEndTime.setHours(newEndTime.getHours() + 1);
        setEndTime(newEndTime);
    }
    };

    return (
        <div className="interviewer-home">
            <ToastContainer position="top-center" autoClose={3000} />
            
            <header className="homepage-header">
                <h1>基于眼动分析的防大语言模型作弊的面试系统</h1>
                <div className="header-buttons">
                    <RoleSwitcher currentRole="interviewer" />
                    <button className="user-center-btn" onClick={() => navigate('/interviewer/profile')}>
                        用户中心
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        退出
                    </button>
                </div>
            </header>

            <main className="main-content">
                <div className="action-bar">
                    <button 
                        className="create-btn"
                        onClick={() => setShowCreateModal(true)}
                    >
                        新建任务
                    </button>
                </div>

                <div className="interview-list">
                    <h2>面试任务列表</h2>
                    {loading ? (
                        <div className="loading">加载中...</div>
                    ) : interviews.length === 0 ? (
                        <div className="no-data">暂无面试任务</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>面试者姓名</th>
                                    <th>面试者邮箱</th>
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
                                        <td>{interview.intervieweeName}</td>
                                        <td>{interview.intervieweeEmail}</td>
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
                                                进入
                                            </button>
                                            <button 
                                                className="delete-btn"
                                                onClick={() => handleDeleteInterview(interview.intervieweeEmail)}
                                            >
                                                删除
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

             {showCreateModal && (
                <div className="modal-overlay">
                    <div className="create-modal">
                        <h3>创建新面试</h3>
                        <div className="form-group">
                            <label>面试者邮箱</label>
                            <input
                                type="email"
                                value={intervieweeEmail}
                                onChange={(e) => setIntervieweeEmail(e.target.value)}
                                placeholder="请输入面试者邮箱"
                            />
                        </div>
                        <div className="form-group">
                            <label>开始时间</label>
                            <div className="datetime-picker-container">
                                <DatePicker
                                    selected={startTime}
                                    onChange={handleStartTimeChange} // 替换原来的 setStartTime
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={15}
                                    dateFormat="yyyy-MM-dd HH:mm"
                                    minDate={new Date()}
                                    className="datepicker-input"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>结束时间</label>
                            <div className="datetime-picker-container">
                               <DatePicker
                                    selected={endTime} // 改为 endTime
                                    onChange={setEndTime} // 改为 setEndTime
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={15}
                                    dateFormat="yyyy-MM-dd HH:mm"
                                    minDate={startTime} // 确保结束时间不早于开始时间
                                    className="datepicker-input"
                                />
                            </div>
                        </div>
                        <div className="modal-buttons">
                            <button className="cancel-btn" onClick={() => {
                                setShowCreateModal(false);
                                setIntervieweeEmail('');
                            }}>
                                取消
                            </button>
                            <button className="confirm-btn" onClick={handleCreateInterview}>
                                确认
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewerHome;