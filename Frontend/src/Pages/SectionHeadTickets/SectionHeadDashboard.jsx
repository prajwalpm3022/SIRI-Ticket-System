import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { GetTickets } from "../../Services/AdminDashBoard.services";
import secureLocalStorage from "react-secure-storage";

export default function SectionHeadDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  // Add this anywhere inside your SectionHeadDashboard or App.jsx


  let get_all_tickets = async () => {
    try {
      const cust_id = secureLocalStorage.getItem("USER_ID");
      const cust_dept_id = secureLocalStorage.getItem("DEPT_ID");
      let response = await GetTickets(cust_id, cust_dept_id);
      setTickets(response.items || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    get_all_tickets();
  }, []);

  // Group tickets by department with pending, open, completed counts
  const groupedByDept = tickets.reduce((acc, ticket) => {
    const deptName = ticket.CUST_DEPT_NAME?.trim();
    if (!acc[deptName]) {
      acc[deptName] = { name: deptName, new: 0, open: 0, completed: 0 };
    }

    const status = ticket.STATUS_ID ?? null;

    //  New — null/pending + 1,2,3,4
    if (status === null || [1, 2, 3, 4].includes(status)) {
      acc[deptName].new += 1;
      //  Open — 5,7,8,9,10,11,13
    } else if ([5, 7, 8, 9, 10, 11, 13].includes(status)) {
      acc[deptName].open += 1;
      //  Completed — 6,12
    } else if ([6, 12].includes(status)) {
      acc[deptName].completed += 1;
    }

    return acc;
  }, {});

  const departments = Object.values(groupedByDept);
  const deptName = secureLocalStorage.getItem("DEPT_NAME");

  return (
    <>
      <Box>
        {/* Header Section */}
        <Box textAlign="center" sx={{ mb: 6, mt: 6 }}>
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{
              background: "linear-gradient(90deg, #6F60C1, #8f7df0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Welcome <br/>Section Incharge for Tickets
          </Typography>
          <Typography variant="h6" fontWeight={600} color="#6F60C1" mt={2}>
            {deptName}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" mt={1}>
            Here's an overview of your department tickets
          </Typography>
        </Box>

        {/* Department Cards */}
        <Box display="flex" justifyContent="center" gap={5} flexWrap="wrap">
          {departments.length === 0 ? (
            <Typography color="text.secondary">No tickets found.</Typography>
          ) : (
            departments.map((dept, index) => (
              <Card
                key={index}
                onClick={() =>
                  navigate(
                    `/Drawer/tickets/${dept.name.replace(/\s+/g, "_")}`,
                    {
                      state: {
                        tickets: tickets,
                        deptName: dept.name,
                      },
                    },
                  )
                }
                sx={{
                  width: 380,
                  borderRadius: 4,
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                  background: "rgba(255,255,255,0.7)",
                  boxShadow: "0 10px 25px rgba(111, 96, 193, 0.15)",
                  transition: "0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 20px 35px rgba(111, 96, 193, 0.25)",
                  },
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 4 }}>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color="#6F60C1"
                    gutterBottom
                  >
                    {dept.name}
                  </Typography>

                  {/* Pending */}
                  <Box
                    mt={3}
                    sx={{
                      backgroundColor: "rgba(244, 67, 54, 0.08)",
                      borderRadius: 2,
                      py: 1.5,
                      px: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontWeight={500}
                    >
                      New Tickets
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="#f44336">
                      {dept.new}
                    </Typography>
                  </Box>

                  {/* Open */}
                  <Box
                    mt={2}
                    sx={{
                      backgroundColor: "rgba(255, 152, 0, 0.08)",
                      borderRadius: 2,
                      py: 1.5,
                      px: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontWeight={500}
                    >
                      Open Tickets
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="#ff9800">
                      {dept.open}
                    </Typography>
                  </Box>

                  {/* Completed */}
                  <Box
                    mt={2}
                    sx={{
                      backgroundColor: "rgba(76, 175, 80, 0.08)",
                      borderRadius: 2,
                      py: 1.5,
                      px: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontWeight={500}
                    >
                      Completed Tickets
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="#4caf50">
                      {dept.completed}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      </Box>
    </>
  );
}
