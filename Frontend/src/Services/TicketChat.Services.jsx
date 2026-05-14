import API from "./apiClient";

const API_BASE_URL = "TicketChat";

let GetChatMembers = async (ticket_id) => {
  let response = await API.get(`${API_BASE_URL}/getChatMembers/${ticket_id}`);
  return response.data;
};

export { GetChatMembers };
