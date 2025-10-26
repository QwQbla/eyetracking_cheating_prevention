import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_ENDPOINTS } from '../api';
import '../styles/InterviewerProfile.css';
import '../styles/IntervieweeProfile.css';
import RoleSwitcher from '../components/RoleSwitcher';

const InterviewerProfile = () => {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState({
        name: '',
        gender: '男',
        uni: '',
        major: '',
        intv: '',
        mszsjh: '',
        mszmm: '',
        age: ''
    });
    const [loading, setLoading] = useState(true);
    const userEmail = localStorage.getItem('email') || '';

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_ENDPOINTS.itvQuery}?mszyxh=${encodeURIComponent(userEmail)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success === false) {
                throw new Error(result.msg);
            }

            // 根据后端返回的数据结构进行调整
            const backendData = result.data && (Array.isArray(result.data) ? result.data[0] : result.data);
            
            setUserInfo({
                name: backendData?.name || '',
                gender: backendData?.gender || '男',
                uni: backendData?.uni || '',
                major: backendData?.major || '',
                intv: backendData?.intv || '',
                mszsjh: backendData?.mszsjh || '',
                mszmm: backendData?.mszmm || '',
                age: backendData?.age || ''
            });
        } catch (error) {
            console.error('获取用户信息失败:', error);
            toast.error(`获取用户信息失败: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.itvAlert, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mszyxh: userEmail,
                    name: userInfo.name,
                    gender: userInfo.gender,
                    uni: userInfo.uni,
                    major: userInfo.major,
                    intv: userInfo.intv,
                    mszsjh: userInfo.mszsjh,
                    mszmm: userInfo.mszmm,
                    age: userInfo.age
                }),
            });

            const result = await response.json();
            if (response.ok && result.success) {
                toast.success('个人信息更新成功');
            } else {
                toast.error(result.msg || '更新失败');
            }
        } catch (error) {
            toast.error('网络错误，请稍后重试');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserInfo(prev => ({
            ...prev,
            [name]: value
        }));
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
                    <button className="back-button" onClick={() => navigate('/interviewee/home')}>
                        返回首页
                    </button>
                    <button className="save-button" onClick={handleSave}>
                        保存
                    </button>
                </div>
            </header>

            <main className="user-center-content">
                {loading ? (
                    <div className="loading">加载中...</div>
                ) : (
                    <div className="user-center-form">
                        <h2>用户中心</h2>
                        <div className="form-section">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>姓名</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        value={userInfo.name} 
                                        onChange={handleInputChange}
                                        placeholder="请输入您的姓名"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>性别</label>
                                    <select 
                                        name="gender" 
                                        value={userInfo.gender} 
                                        onChange={handleInputChange}
                                        className="form-select"
                                    >
                                        <option value="男">男</option>
                                        <option value="女">女</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>年龄</label>
                                    <input 
                                        type="number" 
                                        name="age" 
                                        value={userInfo.age} 
                                        onChange={handleInputChange}
                                        placeholder="请输入您的年龄"
                                        min="18"
                                        max="60"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>手机号</label>
                                    <input 
                                        type="tel" 
                                        name="mszsjh" 
                                        value={userInfo.mszsjh} 
                                        onChange={handleInputChange}
                                        placeholder="请输入您的手机号"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>毕业院校</label>
                                    <input 
                                        type="text" 
                                        name="uni" 
                                        value={userInfo.uni} 
                                        onChange={handleInputChange}
                                        placeholder="请输入您的毕业院校"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>专业</label>
                                    <input 
                                        type="text" 
                                        name="major" 
                                        value={userInfo.major} 
                                        onChange={handleInputChange}
                                        placeholder="请输入您的专业"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>自我介绍</label>
                                    <textarea 
                                        name="intv" 
                                        value={userInfo.intv} 
                                        onChange={handleInputChange}
                                        placeholder="请简要介绍一下自己..."
                                        rows="4"
                                        className="form-textarea"
                                    />
                                </div>
                            </div>
                            {/*<div className="form-row">
                                <div className="form-group">
                                    <label>密码</label>
                                    <input 
                                        type="password" 
                                        name="mszmm" 
                                        value={userInfo.mszmm} 
                                        onChange={handleInputChange}
                                        placeholder="请输入密码"
                                    />
                                </div>
                            </div>*/}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default InterviewerProfile;