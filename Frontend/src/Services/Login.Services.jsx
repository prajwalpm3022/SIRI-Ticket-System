import API from "./apiClient";

const API_BASE_URL = "TicketLogin";

let CustomerLogin = async (data) => {
  let response = await API.post(`${API_BASE_URL}`, data);
  return response.data;
};

let ForgotPassword = async (email) => {
  let response = await API.post(`${API_BASE_URL}/forgot-password`, { email });
  return response.data;
};

let ResetPassword = async (token, newPassword) => {
  let response = await API.post(`${API_BASE_URL}/reset-password`, {
    token,
    newPassword,
  });
  return response.data;
};

export { CustomerLogin, ForgotPassword, ResetPassword };
