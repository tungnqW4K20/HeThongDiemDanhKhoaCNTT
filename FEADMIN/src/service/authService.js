import axiosClient from './axiosClient'; 
const loginAdmin = (username, password) => {
    return axiosClient.post('/auth/login-admin', { username, password });
};

export default {
    loginAdmin
};