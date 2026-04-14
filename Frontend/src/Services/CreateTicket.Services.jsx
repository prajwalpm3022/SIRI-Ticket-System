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

export { CreateTickets, CategoryGridData, DeleteTicketDocByUser };
