//LoginPage.jsx
import React, { useState } from 'react';
import { API_ENDPOINTS } from '../api.js';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [captcha, setCaptcha] = useState('');
    const [message, setMessage] = useState('');
    const [isSendingCode, setIsSendingCode] = useState(false);
    const navigate = useNavigate();

    const handleSendCode = async () => {
        if (!email) {
            setMessage('邮箱不能为空');
            return;
        }
        if (!isValidEmail(email)) {
            setMessage('邮箱格式不正确');
            return;
        }

        try {
            setIsSendingCode(true);
            setMessage(''); // 清除之前的错误消息
            const response = await fetch(`${API_ENDPOINTS.sendCode}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();
            if (response.ok) {
                toast.success('验证码发送成功');
            } else {
                toast.error(result.msg || '验证码发送失败');
            }
        } catch (error) {
            toast.error('服务器连接失败');
        } finally {
            setIsSendingCode(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !captcha) {
            setMessage(!email ? '邮箱不能为空' : '验证码不能为空');
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, captcha }),
            });

            const result = await response.json();
            if (response.ok) {
                toast.success('登录成功');
                localStorage.setItem('email',email)
                setTimeout(() => {
                    navigate('/interviewer/home');
                }, 1000); 
            } else {
                toast.error(result.msg || '登录失败，请重试');
            }
        } catch (error) {
            toast.error('网络错误，请稍后重试');
        }
    };

    const isValidEmail = (email) => {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
    };

    return (
        <div className="login-container" id="loginPage">
            <ToastContainer
                position="top-center"
                autoClose={1000}
                hideProgressBar
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
            <div className="login-form">
                <h2 className="login-title">基于眼动分析的防大语言模型作弊的面试系统</h2>
                <div className="input-group">
                    <input
                        type="email"
                        id="email"
                        placeholder="请输入邮箱"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setMessage(''); // 输入时清除错误消息
                        }}
                    />
                </div>
                {message && <div className="message-container">{message}</div>}
                <div className="input-group">
                    <div className="code-input-group">
                        <input
                            type="text"
                            id="captcha"
                            placeholder="请输入验证码"
                            value={captcha}
                            onChange={(e) => {
                                setCaptcha(e.target.value);
                                setMessage(''); // 输入时清除错误消息
                            }}
                        />
                        <button
                            className={`get-code-button ${isSendingCode ? 'disabled' : ''}`}
                            onClick={handleSendCode}
                            disabled={isSendingCode}
                        >
                            {isSendingCode ? '发送中...' : '获取验证码'}
                        </button>
                    </div>
                </div>
                <button className="login-button" onClick={handleLogin}>
                    登录
                </button>
            </div>
        </div>
    );
};

export default LoginPage;