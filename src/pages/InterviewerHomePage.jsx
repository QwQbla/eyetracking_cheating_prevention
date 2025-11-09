//InterviewerHomePage.jsx
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
    let lastToastMessage = '';
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [intervieweeEmail, setIntervieweeEmail] = useState('');
    const [intervieweeName, setIntervieweeName] = useState(''); // 新增：面试者姓名
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState(localStorage.getItem('email') || '');
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(() => {
        const initialEndTime = new Date();
        initialEndTime.setHours(initialEndTime.getHours() + 1);
        return initialEndTime;
    });

    const [showViewModal, setShowViewModal] = useState(false);
    const [intervieweeInfo, setIntervieweeInfo] = useState({
        name: '',
        gender: '',
        uni: '',
        major: '',
        intv: '',
        mszsjh: '',
        age: '',
        mszmm: '',
        mszyxh: ''
    });

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

    // 获取面试官创建的面试任务
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
                intervieweeEmail: item.mszyxh,
                intervieweePhone: item.mszsjh,
                roomId: item.fjh,
                startTime: item.kssj,
                endTime: item.jssj,
                status: item.zt,
                role: 'interviewer'
            }));
            
            setInterviews(formattedInterviews);
        } catch (error) {
            console.error('获取面试列表失败:', error);
            debounceToast(`获取面试列表失败: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleViewInterviewee = async (email) => {
        try {
            const response = await fetch(`${API_ENDPOINTS.empitvQuery}?mszyxh=${encodeURIComponent(email)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success === false) {
                throw new Error(result.msg);
            }

            const intervieweeData = result.data && result.data.length > 0 ? result.data[0] : {};
            setIntervieweeInfo({
                name: intervieweeData.name || '未填写',
                gender: intervieweeData.gender || '未填写',
                uni: intervieweeData.uni || '未填写',
                major: intervieweeData.major || '未填写',
                intv: intervieweeData.intv || '未填写',
                mszsjh: intervieweeData.mszsjh || '未填写',
                age: intervieweeData.age || '未填写',
                mszmm: intervieweeData.mszmm || '未填写',
                mszyxh: intervieweeData.mszyxh || email
            });
            setShowViewModal(true);
        } catch (error) {
            console.error('获取面试者信息失败:', error);
            debounceToast(`获取面试者信息失败: ${error.message}`);
        }
    };

    useEffect(() => {
        localStorage.setItem('userRole', 'interviewer');
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'interviewee') {
            navigate('/interviewee/home');
            return;
        }
        
        fetchInterviews();
        
        const interval = setInterval(() => {
            setInterviews(prev => prev.map(item => ({
                ...item,
                status: item.status
            })));
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('userRole');
        navigate('/');
    };

    const handleCreateInterview = async () => {
        // 验证必填字段
        if (!intervieweeEmail || !intervieweeName || !startTime) {
            toast.error('请填写完整信息');
            return;
        }

        if (startTime >= endTime) {
            toast.error('结束时间必须晚于开始时间');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(intervieweeEmail)) {
            toast.error('请输入有效的面试者邮箱地址');
            return;
        }

        try {
            // 计算初始状态
            const now = new Date();
            let status = "未开始";
            
            if (now >= startTime && now <= endTime) {
                status = "进行中";
            } else if (now > endTime) {
                status = "已结束";
            }

            // 构建请求体
            const requestBody = {
                mszyxh: intervieweeEmail,
                ygyxh: userEmail,
                kssj: startTime.toISOString(),
                jssj: endTime.toISOString(),
                mszxm: intervieweeName,
                zt: status  // 使用计算后的状态
            };

            console.log('发送的请求体:', requestBody);

            const response = await fetch(API_ENDPOINTS.empTaskInsert, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();
            console.log('接口响应:', result);

            if (response.ok && result.success) {
                toast.success('面试创建成功');
                setShowCreateModal(false);
                setIntervieweeEmail('');
                setIntervieweeName('');
                fetchInterviews();
            } else {
                toast.error(result.msg || '创建面试失败');
            }
        } catch (error) {
            console.error('创建面试错误:', error);
            toast.error('网络错误，请稍后重试');
        }
    };

    // 更新房间状态的辅助函数 - 也改为JSON格式
    const updateRoomStatus = async (roomId, interviewId, newStatus) => {
        try {
            const requestBody = {
                fjh: roomId,
                zt: newStatus
            };

            const response = await fetch(API_ENDPOINTS.empTaskAlert, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // 改为JSON
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                // 更新前端状态
                setInterviews(prev => prev.map(item => 
                    item.id === interviewId 
                        ? { ...item, status: newStatus }
                        : item
                ));
                return true;
            } else {
                throw new Error(result.msg || '更新状态失败');
            }
        } catch (error) {
            console.error('更新房间状态失败:', error);
            return false;
        }
    };

    const handleEnterRoom = async (interview) => {
        try {
            const now = new Date();
            const start = new Date(interview.startTime);
            const end = new Date(interview.endTime);

            // 基本时间验证
            if (now < start) {
                debounceToast('面试尚未开始');
                return;
            }
            
            if (now > end) {
                debounceToast('面试已结束');
                await updateRoomStatus(interview.roomId, interview.id, '已结束');
                return;
            }

            // 构建JSON格式的请求体 - 与Postman一致
            const requestBody = {
                fjh: interview.roomId,
                zt: 'check' // 查询状态
            };

            console.log('发送的请求体:', JSON.stringify(requestBody));

            const response = await fetch(API_ENDPOINTS.empTaskAlert, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // 改为JSON格式
                },
                body: JSON.stringify(requestBody) // 序列化为JSON字符串
            });

            const result = await response.json();
            console.log('接口响应:', result);
            
            if (!response.ok || !result.success) {
                throw new Error(result.msg || '获取房间状态失败');
            }

            // 获取实际状态
            const currentStatus = result.data?.zt || result.zt || interview.status;
            
            console.log('房间当前状态:', currentStatus);

            // 更新前端任务栏显示的状态
            setInterviews(prev => prev.map(item => 
                item.id === interview.id 
                    ? { ...item, status: currentStatus }
                    : item
            ));

            // 状态处理逻辑
            switch (currentStatus) {
                case '进行中':
                    navigate(`/interviewer/content/${interview.roomId}`);
                    break;
                    
                case '未开始':
                    debounceToast(`房间状态: ${currentStatus}，请等待面试开始`);
                    break;
                    
                case '已结束':
                    debounceToast(`房间状态: ${currentStatus}，无法进入`);
                    break;
                    
                case '已关闭':
                    debounceToast(`房间状态: ${currentStatus}，房间已关闭`);
                    break;
                    
                default:
                    debounceToast(`房间状态: ${currentStatus}，无法进入`);
                    break;
            }

        } catch (error) {
            console.error('进入房间失败:', error);
            debounceToast(`进入房间失败: ${error.message}`);
        }
    };
    const handleDeleteInterview = async (interviewId) => {
        try {
            // 使用 URLSearchParams 来构建 x-www-form-urlencoded 格式的数据
            const formData = new URLSearchParams();
            formData.append('msjlh', interviewId);

            const response = await fetch(API_ENDPOINTS.empTaskDelete, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString() // 使用 URLSearchParams 的字符串形式
            });

            const result = await response.json();
            if (response.ok && result.success) {
                toast.success('删除成功');
                //fetchInterviews();
                setInterviews(prevInterviews => 
                prevInterviews.filter(interview => interview.id !== interviewId)
            );
            } else {
                toast.error(result.msg || '删除失败');
            }
        } catch (error) {
            toast.error('网络错误，请稍后重试');
        }
    };

    const handleStartTimeChange = (date) => {
        setStartTime(date);
        if (date >= endTime) {
            const newEndTime = new Date(date);
            newEndTime.setHours(newEndTime.getHours() + 1);
            setEndTime(newEndTime);
        }
    };

    // 关闭模态框时重置表单
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setIntervieweeEmail('');
        setIntervieweeName('');
    };

    return (
        <div className="interviewer-home">
            <ToastContainer 
                position="top-center" 
                autoClose={2000} 
                hideProgressBar={true}//隐藏进度条
                pauseOnHover={false}//鼠标悬停不暂停
            />
            
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
                    <h2>我创建的面试任务</h2>
                    {loading ? (
                        <div className="loading">加载中...</div>
                    ) : interviews.length === 0 ? (
                        <div className="no-data">暂无创建的面试任务</div>
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
                                                className="view-btn"
                                                onClick={() => handleViewInterviewee(interview.intervieweeEmail)}
                                            >
                                                查看
                                            </button>
                                            <button 
                                                className="enter-btn"
                                                onClick={() => handleEnterRoom(interview)}
                                                disabled={interview.status === '已结束' || interview.status === '已关闭'}
                                            >
                                                进入
                                            </button>
                                            <button 
                                                className="delete-btn"
                                                onClick={() => handleDeleteInterview(interview.id)}
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

            {/* 查看面试者信息模态框 */}
            {showViewModal && (
                <div className="modal-overlay">
                    <div className="view-modal">
                        <h3>面试者信息</h3>
                        <div className="info-container">
                            <div className="info-row">
                                <span className="info-label">姓名:</span>
                                <span className="info-value">{intervieweeInfo.name}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">性别:</span>
                                <span className="info-value">{intervieweeInfo.gender}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">年龄:</span>
                                <span className="info-value">{intervieweeInfo.age}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">手机号:</span>
                                <span className="info-value">{intervieweeInfo.mszsjh}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">邮箱:</span>
                                <span className="info-value">{intervieweeInfo.mszyxh}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">学校:</span>
                                <span className="info-value">{intervieweeInfo.uni}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">专业:</span>
                                <span className="info-value">{intervieweeInfo.major}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">自我介绍:</span>
                                <p className="info-text">{intervieweeInfo.intv}</p>
                            </div>
                        </div>
                        <div className="modal-buttons">
                            <button 
                                className="close-btn" 
                                onClick={() => setShowViewModal(false)}
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 创建面试模态框 - 已更新 */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="create-modal">
                        <h3>创建新面试</h3>
                        
                        {/* 新增：面试者姓名字段 */}
                        <div className="form-group">
                            <label>面试者姓名 *</label>
                            <input
                                type="text"
                                value={intervieweeName}
                                onChange={(e) => setIntervieweeName(e.target.value)}
                                placeholder="请输入面试者姓名"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>面试者邮箱 *</label>
                            <input
                                type="email"
                                value={intervieweeEmail}
                                onChange={(e) => setIntervieweeEmail(e.target.value)}
                                placeholder="请输入面试者邮箱"
                            />
                        </div>
                        <div className="form-group">
                            <label>开始时间 *</label>
                            <DatePicker
                                selected={startTime}
                                onChange={handleStartTimeChange}
                                showTimeSelect
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                dateFormat="yyyy-MM-dd HH:mm"
                                minDate={new Date()}
                                className="datepicker-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>结束时间 *</label>
                            <DatePicker
                                selected={endTime}
                                onChange={setEndTime}
                                showTimeSelect
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                dateFormat="yyyy-MM-dd HH:mm"
                                minDate={startTime}
                                className="datepicker-input"
                            />
                        </div>
                        <div className="modal-buttons">
                            <button className="cancel-btn" onClick={handleCloseModal}>
                                取消
                            </button>
                            <button className="confirm-btn" onClick={handleCreateInterview}>
                                确认创建
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewerHome;