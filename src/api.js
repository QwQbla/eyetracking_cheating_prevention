//api.js
export const BASE_URL = 'https://8.148.191.101:80'; // 替换为实际的 API 基础 URL
export const BASE_URL1 = 'http://localhost:5000/api';

export const API_ENDPOINTS = {
    //登录
    itvlogin: `${BASE_URL}/itv/login-with-captcha`,
    itvsendCode: `${BASE_URL}/itv/send-captcha`,
    emplogin: `${BASE_URL}/emp/login-with-captcha`,
    empsendCode: `${BASE_URL}/emp/send-captcha`,
    // 面试官接口
    empTaskQuery: `${BASE_URL}/emp/TaskQueryById`,
    empTaskInsert: `${BASE_URL}/emp/TaskInsertById`,
    empTaskDelete: `${BASE_URL}/emp/TaskDeleteById`,
    empitvQuery: `${BASE_URL}/emp/QueryMszById`,
    empTaskAlert: `${BASE_URL}/emp/TaskAlertById`,
    // 面试者接口
    itvTaskQuery: `${BASE_URL}/itv/TaskQueryById`,
    itvTaskAlert: `${BASE_URL}/itv/TaskAlertById`,
    //员工个人信息
    empQuery: `${BASE_URL}/emp/QueryById`, 
    empAlert: `${BASE_URL}/emp/AlertById`,
    //面试者个人信息
    itvQuery: `${BASE_URL}/itv/QueryById`,
    itvAlert: `${BASE_URL}/itv/AlertById`,
    //眼动数据接口
    gazeData:`${BASE_URL}/static-json/save`
};

// 用户类型枚举
export const USER_TYPES = {
  INTERVIEWER: 'interviewer', // 面试者
  EMPLOYER: 'employer'        // 面试官
};
