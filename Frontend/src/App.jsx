import { Routes, Route } from "react-router";
import { lazy, Suspense } from "react";
import "./App.css";
import { CircularProgress, Box } from "@mui/material";
import ProtectedRoute from "./utils/ProtectedRoute";

// ─── Eager load — always needed immediately after login ──────────────────────
import SheshaDrawrer from "./Pages/Drawer";
import SectionHeadDashboard from "./Pages/SectionHeadTickets/SectionHeadDashboard";
import Login from "./Pages/Login";

// ─── Lazy load — secondary routes, preloaded in background ──────────────────
const CreateTicket = lazy(() => import("./Pages/Ticketcreation/ticketcreate"));
const OpenTicket = lazy(() => import("./Pages/UserRaisedTickets/openticket"));
const CompletedTickets = lazy(
  () => import("./Pages/CompletedTickets/CompletedTickets"),
);
const UpdateTicket = lazy(
  () => import("./Pages/SectionHeadTickets/UpdateTicket"),
);
const AdminDashBoard = lazy(
  () => import("./Pages/AdminTickets/AdminDashBoard"),
);
const AdminTicketView = lazy(
  () => import("./Pages/AdminTickets/AdminTicketView"),
);
const OpenSectionHeadticket = lazy(
  () => import("./Pages/SectionHeadTickets/OpenSectionHeadticket"),
);
const UserCreation = lazy(
  () => import("./Pages/AdminTickets/UserCreation/UserCreation"),
);

// ─── Preload all lazy chunks in background after app mounts ─────────────────
// These run silently — by the time user clicks nav, chunks are already cached
const preloadAllRoutes = () => {
  import("./Pages/Ticketcreation/ticketcreate");
  import("./Pages/UserRaisedTickets/openticket");
  import("./Pages/CompletedTickets/CompletedTickets");
  import("./Pages/SectionHeadTickets/UpdateTicket");
  import("./Pages/AdminTickets/AdminDashBoard");
  import("./Pages/AdminTickets/AdminTicketView");
  import("./Pages/SectionHeadTickets/OpenSectionHeadticket");
  import("./Pages/AdminTickets/UserCreation/UserCreation");
};

// ─── Kick off preloading after browser is idle ──────────────────────────────
if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(preloadAllRoutes); // runs when browser has free time
  } else {
    setTimeout(preloadAllRoutes, 200); // fallback for Safari
  }
}

const PageLoader = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      width: "100%",
    }}
  >
    <CircularProgress sx={{ color: "#6F60C1" }} />
  </Box>
);

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route
            path="SectionHeadDashboard"
            element={<SectionHeadDashboard />}
          />
          <Route path="AdminDashBoard" element={<AdminDashBoard />} />
          <Route path="UserCreation" element={<UserCreation />} />
          <Route path="AdminTicketView/:deptId" element={<AdminTicketView />} />
          <Route
            path="tickets/:department"
            element={<OpenSectionHeadticket />}
          />
          <Route path="UpdateTicket/:id" element={<UpdateTicket />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
