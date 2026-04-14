import React, { useState, useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import dayjs from "dayjs";
import { GetTickets } from "../../Services/AdminDashBoard.services";
import secureLocalStorage from "react-secure-storage";
import TicketFilter from "./ticketfilter";
import TicketGrid from "./ticketgrid";

export default function OpenTickets() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterDate, setFilterDate] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  let deptName = secureLocalStorage.getItem("DEPT_NAME");

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const cust_id = secureLocalStorage.getItem("USER_ID");
      const cust_dept_id = secureLocalStorage.getItem("DEPT_ID");
      const cust_login_id = secureLocalStorage.getItem("CUST_LOGIN_ID");
      const response = await GetTickets(cust_id, cust_dept_id,cust_login_id);
      setTickets(response?.items || []);
    } catch (error) {
      console.error(error);
    }finally{
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSearch = () => {
    setFilterDate(selectedDate);
  };
  const handleClear = () => {
    setSelectedDate(null);
    setFilterDate(null);
  };
  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 1, borderRadius: 2, mb: 2 }}>
        <Typography variant="h4" fontWeight={600}>
          RAISED TICKETS - {deptName}
        </Typography>
      </Paper>

      {/* Filter */}
      <Box sx={{ mb: 4 }}>
        <TicketFilter
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onSearch={handleSearch}
          onClear={handleClear}
        />
      </Box>

      {/* Grid */}
      <TicketGrid tickets={tickets} selectedDate={filterDate} loading={loading}/>
    </Box>
  );
}
