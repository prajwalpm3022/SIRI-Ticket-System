import API from "./apiClient";

const API_BASE_URL = "DeptCreation";

let getDepartments = async () => {
  let response = await API.get(`${API_BASE_URL}/getDepartments`);
  return response.data;
};

let createDepartment = async (data) => {
  let response = await API.post(`${API_BASE_URL}/createDepartment`, data);
  return response.data;
};

let updateDepartment = async (data) => {
  let response = await API.put(`${API_BASE_URL}/updateDepartment`, data);
  return response.data;
};

let deleteDepartment = async (cust_dept_id) => {
  let response = await API.delete(`${API_BASE_URL}/deleteDepartment/${cust_dept_id}`);
  return response.data;
};

export { getDepartments, createDepartment, updateDepartment, deleteDepartment };
