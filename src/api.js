export const BASE_URL = 'http://localhost:5000/api'; // 替换为实际的 API 基础 URL

export const API_ENDPOINTS = {
    login: `${BASE_URL}/loginBySms`, // 登录接口
    sendCode: `${BASE_URL}/sendCode`, // 发送验证码接口
    createInterviewTask: `${BASE_URL}/emp/TaskInsertById`,
    deleteInterviewTask: `${BASE_URL}/emp/TaskDeleteById`,
    getTasks: `${BASE_URL}/emp/GetTasks`, // 获取任务的接口
    // 其他 API 可以在这里添加
    queryEmployeeInfo: (phone) => axios.get(`${API_BASE_URL}/emp/QueryById`, {
        params: { ygsjh: phone }
    }),
    updateEmployeeInfo: (data) => axios.post(`${API_BASE_URL}/emp/AlertById`, data)
};
