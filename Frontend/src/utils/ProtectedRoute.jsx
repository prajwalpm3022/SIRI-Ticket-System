import { Navigate } from "react-router-dom";
import { showAlert } from "../Components/swal_alert";
import secureLocalStorage from "react-secure-storage";
export default function ProtectedRoute({ children }) {
  const token = secureLocalStorage.getItem("AUTH_TOKEN");  
  if (!token) {
    showAlert("warning", "Access Denied", "Please login to continue.");
    return <Navigate to="/" replace />;
  }

  return children;
}
