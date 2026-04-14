import { Routes, Route } from "react-router";
import "./App.css";
import SheshaDrawrer from "./Pages/Drawer";
import Login from "./Pages/Login";
import ProtectedRoute from "./utils/ProtectedRoute";
import CreateTicket from "./Pages/Ticketcreation/ticketcreate";
import OpenTicket from "./Pages/UserRaisedTickets/openticket";
import CompletedTickets from "./Pages/CompletedTickets/CompletedTickets";
import SectionHeadDashboard from "./Pages/SectionHeadTickets/SectionHeadDashboard";
import UpdateTicket from "./Pages/SectionHeadTickets/UpdateTicket";
import AdminDashBoard from "./Pages/AdminTickets/AdminDashBoard";
import AdminTicketView from "./Pages/AdminTickets/AdminTicketView";
import OpenSectionHeadticket from "./Pages/SectionHeadTickets/OpenSectionHeadticket";
import UserCreation from "./Pages/AdminTickets/UserCreation/UserCreation";
import DepartmentCreation from "./Pages/AdminTickets/DepartmentCreation/DepartmentCreation";
function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/Drawer"
          element={
            <ProtectedRoute>
              <SheshaDrawrer />
            </ProtectedRoute>
          }
        >
          <Route index element={<SectionHeadDashboard />} />
          <Route path="open-ticket" element={<OpenTicket />} />
          <Route path="create-ticket" element={<CreateTicket />} />
          <Route path="CompletedTickets" element={<CompletedTickets />} />
          <Route path="SectionHeadDashboard" element={<SectionHeadDashboard />} />
          <Route path="AdminDashBoard" element={<AdminDashBoard />} />
          <Route path="UserCreation" element={<UserCreation />} />
          <Route path="DepartmentCreation" element={<DepartmentCreation />} />
          {/* <Route path="AdminTickets/:department" element={<OpenAdminTicket />} /> */}
          <Route path="AdminTicketView/:deptId" element={<AdminTicketView />} />
          <Route path="tickets/:department" element={<OpenSectionHeadticket />} />
          <Route path="UpdateTicket/:id" element={<UpdateTicket />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
