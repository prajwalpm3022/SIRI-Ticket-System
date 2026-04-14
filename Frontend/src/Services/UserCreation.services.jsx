import API from "./apiClient";

const API_BASE_URL = "UserCreationByAdmin";

let getCustLogins = async (cust_id) => {
  let response = await API.get(`${API_BASE_URL}/getCustLogins`, {
    params: { cust_id },
  });
  return response.data;
};
let getCustDepartments = async () => {
  let response = await API.get(`${API_BASE_URL}/getCustDepartments`);
  return response.data;
};

let createCustUserLogin = async (data) => {
  let response = await API.post(`${API_BASE_URL}/createCustLogin`, data);
  return response.data;
};

let updateCustUserLogin = async (data) => {
  let response = await API.put(`${API_BASE_URL}/updateCustLogin`, data);
  return response.data;
};

export {
  getCustLogins,
  getCustDepartments,
  createCustUserLogin,
  updateCustUserLogin,
};
