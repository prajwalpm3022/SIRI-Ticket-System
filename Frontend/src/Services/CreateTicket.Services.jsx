import API from "./apiClient";

const API_BASE_URL = "CreateTicket";

let CreateTickets = async (data) => {
  let response = await API.post(`${API_BASE_URL}`, data);
  return response.data;
};

let CategoryGridData = async (data) => {
  let response = await API.get(`${API_BASE_URL}/category`, data);
  return response.data;
};

let DeleteTicketDocByUser = async (ticket_doc_id) => {
  const response = await API.delete(
    `${API_BASE_URL}/deleteTicketDocByUser/${ticket_doc_id}`,
  );
  return response.data;
};
const verifyTicket = async (ticket_id, remarks) => {
  const response = await API.put(`${API_BASE_URL}/verify-ticket/${ticket_id}`, {
    remarks,
  });
  return response.data;
};

const reopenTicket = async (ticket_id) => {
  const response = await API.put(`${API_BASE_URL}/reopen-ticket/${ticket_id}`);
  return response.data;
};

export {
  CreateTickets,
  CategoryGridData,
  DeleteTicketDocByUser,
  verifyTicket,
  reopenTicket,
};
