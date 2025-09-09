import React, { useState } from 'react';
import { API_ENDPOINTS } from '../api';
import '../styles/LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async () => {
        if (!email || !code) {
            setMessage('邮箱和验证码不能为空！');
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, code }),
            });

            const result = await response.json();
            if (response.ok) {
                // 登录成功逻辑，例如跳转到面试官首页
                console.log('登录成功', result);
                // 这里可以使用 navigate 跳转
            } else {
                setMessage(result.msg || '登录失败，请重试');
            }
        } catch (error) {
            setMessage('网络错误，请稍后重试');
        }
    };

    return (
        <div className="login-container" id="loginPage">
            <div className="login-form">
                <h2 className="login-title">基于眼动分析的防大语言模型作弊的面试系统</h2>
                <div className="input-group">
                    <input
                        type="email"
                        id="email"
                        placeholder="请输入邮箱"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <input
                        type="text"
                        id="code"
                        placeholder="请输入验证码"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                </div>
                <button className="login-button" onClick={handleLogin}>
                    登录
                </button>
                {message && <p className="error-message">{message}</p>}
            </div>
        </div>
    );
};

export default LoginPage;
