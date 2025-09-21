//api.js
export const BASE_URL = 'http://localhost:5000/api'; // 替换为实际的 API 基础 URL

export const API_ENDPOINTS = {
    login: `${BASE_URL}/loginBySms`, // 登录接口
    sendCode: `${BASE_URL}/sendCode`, // 发送验证码接口
    // 面试官接口
    empTaskQuery: `${BASE_URL}/emp/TaskQueryById`,
    empTaskInsert: `${BASE_URL}/emp/TaskInsertById`,
    empTaskDelete: `${BASE_URL}/emp/TaskDeleteById`,
    // 面试者接口
    itvTaskQuery: `${BASE_URL}/itv/TaskQueryById`,
    //个人信息
    empQuery: `${BASE_URL}/emp/QueryById`, 
    empAlert: `${BASE_URL}/emp/AlertById`
};
