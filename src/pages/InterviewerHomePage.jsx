import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/InterviewerHomePage.css';
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';

const InterviewerHome = () => {
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [intervieweePhone, setIntervieweePhone] = useState('');
    const [interviews, setInterviews] = useState([
        {
            id: 1,
            intervieweeName: '张三',
            roomId: 'ROOM123',
            startTime: '2023-10-15 14:00',
            endTime: '2023-10-15 15:00',
            status: '未开始'
        },
        {
            id: 2,
            intervieweeName: '李四',
            roomId: 'ROOM456',
            startTime: '2023-10-15 10:00',
            endTime: '2023-10-15 11:00',
            status: '已结束'
        }
    ]);

    // 模拟定时更新面试状态
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setInterviews(prevInterviews => 
                prevInterviews.map(interview => {
                    const start = new Date(interview.startTime);
                    const end = new Date(interview.endTime);
                    
                    let status = interview.status;
                    if (now < start) status = '未开始';
                    else if (now >= start && now <= end) status = '进行中';
                    else if (now > end) status = '已结束';
                    
                    return {...interview, status};
                })
            );
        }, 60000); // 每分钟检查一次

        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        // 删除用户登录状态逻辑
        localStorage.removeItem('token');
        navigate('/');
    };

    const handleCreateInterview = () => {
        if (!intervieweePhone || !startTime || !endTime) {
            toast.error('请填写完整信息');
            return;
        }
        if (startTime >= endTime) {
            toast.error('结束时间必须晚于开始时间');
            return;
        }

        // 生成随机房间号
        const newRoomId = 'ROOM' + Math.floor(1000 + Math.random() * 9000);
        
        const newInterview = {
            id: interviews.length + 1,
            intervieweeName: '新面试者', // 实际应用中应从API获取
            roomId: newRoomId,
            startTime: startTime.toLocaleString(),
            endTime: endTime.toLocaleString(),
            status: '未开始'
        };

        setInterviews([...interviews, newInterview]);
        setShowCreateModal(false);
        toast.success('面试创建成功');
    };

    const handleEnterRoom = (interview) => {
        const now = new Date();
        const start = new Date(interview.startTime);
        const end = new Date(interview.endTime);

        if (now < start) {
            toast.error('面试尚未开始');
            return;
        }
        if (now > end) {
            toast.error('面试已结束');
            return;
        }

        navigate(`/interview-room/${interview.roomId}`);
    };

    const handleViewDetails = (interview) => {
        navigate(`/interviewee-details/${interview.id}`);
    };

    return (
        <div className="interviewer-home">
            <ToastContainer position="top-center" autoClose={3000} />
            
            {/* 标题栏 */}
            <header className="header">
                <h1>基于眼动分析的防大语言模型作弊的面试系统</h1>
                <div className="header-buttons">
                    <button 
                        className="interviewee-btn"
                        onClick={() => navigate('/interviewee/home')}
                    >
                        面试者
                    </button>
                    <button className="user-center-btn" onClick={() => navigate('/interviewer/profile')}>
                        用户中心
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        退出
                    </button>
                </div>
            </header>

            {/* 主要内容区 */}
            <main className="main-content">
                <div className="action-bar">
                    <button 
                        className="create-btn"
                        onClick={() => setShowCreateModal(true)}
                    >
                        新建任务
                    </button>
                </div>

                {/* 面试列表 */}
                <div className="interview-list">
                    <h2>面试任务列表</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>面试者姓名</th>
                                <th>房间号</th>
                                <th>开始时间</th>
                                <th>状态</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {interviews.map(interview => (
                                <tr key={interview.id}>
                                    <td>{interview.intervieweeName}</td>
                                    <td>{interview.roomId}</td>
                                    <td>{interview.startTime}</td>
                                    <td className={`status ${interview.status}`}>
                                        {interview.status}
                                    </td>
                                    <td>
                                        <button 
                                            className="view-btn"
                                            onClick={() => handleViewDetails(interview)}
                                        >
                                            查看
                                        </button>
                                        <button 
                                            className="enter-btn"
                                            onClick={() => handleEnterRoom(interview)}
                                        >
                                            进入
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* 创建面试模态框 */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="create-modal">
                        <h3>创建新面试</h3>
                        <div className="form-group">
                            <label>面试者手机号</label>
                            <input
                                type="text"
                                value={intervieweePhone}
                                onChange={(e) => setIntervieweePhone(e.target.value)}
                                placeholder="请输入面试者手机号"
                            />
                        </div>
                        <div className="form-group">
                            <label>开始时间</label>
                            <DateTimePicker
                                onChange={setStartTime}
                                value={startTime}
                                format="yyyy-MM-dd HH:mm"
                            />
                        </div>
                        <div className="form-group">
                            <label>结束时间</label>
                            <DateTimePicker
                                onChange={setEndTime}
                                value={endTime}
                                format="yyyy-MM-dd HH:mm"
                                minDate={startTime}
                            />
                        </div>
                        <div className="modal-buttons">
                            <button className="cancel-btn" onClick={() => setShowCreateModal(false)}>
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