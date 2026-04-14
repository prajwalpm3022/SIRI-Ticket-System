import API from "./apiClient";

const API_BASE_URL = "Login";

let CustomerLogin = async (data) => {
  let response = await API.post(`${API_BASE_URL}`, data);
  return response.data;
};

export { CustomerLogin };
