import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_ENDPOINTS } from '../api';
import '../styles/InterviewerProfile.css';
import RoleSwitcher from '../components/RoleSwitcher';

const InterviewerProfile = () => {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState({
        ygsjh: '',
        ygyxh: '',
        name: '',
        gsmc: '',
        gsdz: ''
    });
    const [loading, setLoading] = useState(true);
    const userEmail = localStorage.getItem('email') || '';

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_ENDPOINTS.empQuery}?ygyxh=${encodeURIComponent(userEmail)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success === false) {
                throw new Error(result.msg);
            }

            // 根据返回的数据结构调整
            if (result.data && result.data.length > 0) {
                const userData = result.data[0]; // 取数组第一项
                setUserInfo({
                    ygsjh: userData.ygsjh || '',
                    ygyxh: userData.ygyxh || userEmail, // 优先使用返回的邮箱，否则用本地存储的
                    name: userData.name || '',
                    gsmc: userData.gsmc || '',
                    gsdz: userData.gsdz || ''
                });
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            toast.error(`获取用户信息失败: ${error.message}`);
            
            // 使用默认值
            setUserInfo({
                ygsjh: '',
                ygyxh: userEmail,
                name: '',
                gsmc: '',
                gsdz: ''
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.empAlert, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ygyxh: userInfo.ygyxh,
                    ygsjh: userInfo.ygsjh,
                    name: userInfo.name,
                    gsmc: userInfo.gsmc,
                    gsdz: userInfo.gsdz
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
                    <button className="back-button" onClick={() => navigate('/interviewer/home')}>
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
                                    <label>邮箱</label>
                                    <input 
                                        type="email" 
                                        name="ygyxh" 
                                        value={userInfo.ygyxh} 
                                        readOnly
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>手机号</label>
                                    <input 
                                        type="tel" 
                                        name="ygsjh" 
                                        value={userInfo.ygsjh} 
                                        onChange={handleInputChange}
                                        placeholder="请输入手机号"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>姓名</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        value={userInfo.name} 
                                        onChange={handleInputChange}
                                        placeholder="请输入姓名"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>公司名称</label>
                                    <input 
                                        type="text" 
                                        name="gsmc" 
                                        value={userInfo.gsmc} 
                                        onChange={handleInputChange}
                                        placeholder="请输入公司名称"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>公司地址</label>
                                    <input 
                                        type="text" 
                                        name="gsdz" 
                                        value={userInfo.gsdz} 
                                        onChange={handleInputChange}
                                        placeholder="请输入公司地址"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default InterviewerProfile;