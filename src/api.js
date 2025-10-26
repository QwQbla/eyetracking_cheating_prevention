//api.js
export const BASE_URL = 'http://8.148.191.101:80'; // 替换为实际的 API 基础 URL
export const BASE_URL1 = 'http://localhost:5000/api';

export const API_ENDPOINTS = {
    //login: `${BASE_URL1}/loginBySms`, // 登录接口
    login: `${BASE_URL}/itv/login-with-captcha`,
    //sendCode: `${BASE_URL1}/sendCode`, // 发送验证码接口
    sendCode: `${BASE_URL}/itv/send-captcha`,
    // 面试官接口
    empTaskQuery: `${BASE_URL}/emp/TaskQueryById`,
    empTaskInsert: `${BASE_URL}/emp/TaskInsertById`,
    empTaskDelete: `${BASE_URL}/emp/TaskDeleteById`,
    empitvQuery: `${BASE_URL}/emp/QueryMszById`,
    // 面试者接口
    itvTaskQuery: `${BASE_URL}/itv/TaskQueryById`,
    //员工个人信息
    empQuery: `${BASE_URL}/emp/QueryById`, 
    empAlert: `${BASE_URL}/emp/AlertById`,
    //面试者个人信息
    itvQuery: `${BASE_URL}/itv/QueryById`,
    itvAlert: `${BASE_URL}/itv/AlertById`
};
