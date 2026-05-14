import API from "./apiClient";

const API_BASE_URL = "ticketnotification";

export async function getclientnotification(send_to, send_to_type) {
  const response = await API.get(`${API_BASE_URL}`, {
    params: { send_to, send_to_type },
  });
  return response.data;
}
export async function markclientNotificationViewed(id) {
  const response = await API.put(`${API_BASE_URL}/${id}/viewed`);
  return response.data;
}
