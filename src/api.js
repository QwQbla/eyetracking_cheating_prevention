const BASE_URL = 'http://localhost:5000/api'; // 替换为实际的 API 基础 URL

export const API_ENDPOINTS = {
    login: `${BASE_URL}/login`, // 登录接口
    createInterviewTask: `${BASE_URL}/emp/TaskInsertById`,
    deleteInterviewTask: `${BASE_URL}/emp/TaskDeleteById`,
    getTasks: `${BASE_URL}/emp/GetTasks`, // 获取任务的接口
    // 其他 API 可以在这里添加
};
