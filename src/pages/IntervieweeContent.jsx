import React from 'react';
import { useNavigate } from 'react-router-dom';
import RoleSwitcher from '../components/RoleSwitcher';
import '../styles/IntervieweeContent.css';

const IntervieweeContent = () => {
    const navigate = useNavigate();
    const userEmail = localStorage.getItem('email') || '';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('userRole');
        navigate('/');
    };

    return (
        <div className="interview-content-page">
            {/* 共享首页的标题样式 */}
            <header className="homepage-header">
                <h1>基于眼动分析的防大语言模型作弊的面试系统</h1>
                <div className="header-buttons">
                    <RoleSwitcher currentRole="interviewer" />
                    <button className="user-center-btn" onClick={() => navigate('/interviewee/home')}>
                        返回首页
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        退出
                    </button>
                </div>
            </header>

            {/* 基础内容区域 */}
            <main className="content-main">
                <div className="content-container">
                    <h1 className="content-title">面试内容页面</h1>
                    <p className="content-description">
                        这里是面试内容页面的基础框架，具体功能正在开发中...
                    </p>
                </div>
            </main>
        </div>
    );
};

export default IntervieweeContent;