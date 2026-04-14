import API from "./apiClient";

const API_BASE_URL = "AdminDashBoard";

const GetTickets = async (
  cust_id,
  cust_dept_id,
  cust_login_id = null, 
  from_date = null,
  to_date = null,
) => {
  const params = { cust_id, cust_dept_id };
  if (cust_login_id) params.cust_login_id = cust_login_id; 
  if (from_date) params.from_date = from_date;
  if (to_date) params.to_date = to_date;

  const response = await API.get(`${API_BASE_URL}/getTickets`, { params });
  return response.data;
};
const GetTicketsForAdmin = async (
  cust_id,
  from_date = null,
  to_date = null,
  dept_id = null,
  status_id = null,
) => {
  const params = { cust_id };
  if (from_date) params.from_date = from_date;
  if (to_date) params.to_date = to_date;
  if (dept_id) params.dept_id = dept_id;
  if (status_id !== null && status_id !== "") params.status_id = status_id;

  const response = await API.get(`${API_BASE_URL}/getTicketsforAdmin`, {
    params,
  });
  return response.data;
};

const GetTicketDD = async () => {
  let response = await API.get(`${API_BASE_URL}/TicketStatusDD`);
  return response.data;
};
const UpdateTicketStatus = async ({ ticket_id, action, remarks }) => {
  const response = await API.put(`${API_BASE_URL}/updateTicketStatus`, {
    ticket_id,
    action,
    ...(remarks && { remarks }),
  });
  return response.data;
};

const PreviewTicketDocument = async (docId) => {
  const res = await API.get(`${API_BASE_URL}/previewTicketDocument/${docId}`, {
    responseType: "blob",
  });
  return res;
};

let UpdateUserTicket = async (ticketId, formData) => {
  let response = await API.put(
    `${API_BASE_URL}/updateTicket/${ticketId}`,
    formData,
  );
  return response.data;
};

const DeleteTicketDoc = async (ticket_doc_id) => {
  let response = await API.put(
    `${API_BASE_URL}/deleteTicketDoc/${ticket_doc_id}`,
  );
  return response.data;
};

export {
  GetTickets,
  UpdateTicketStatus,
  PreviewTicketDocument,
  UpdateUserTicket,
  GetTicketsForAdmin,
  GetTicketDD,
  DeleteTicketDoc,
};
