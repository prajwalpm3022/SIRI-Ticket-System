import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Chip,
  Stack,
  Button,
  Skeleton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { DataGrid } from "@mui/x-data-grid";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { GetTickets } from "../../Services/AdminDashBoard.services";
import secureLocalStorage from "react-secure-storage";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const columns = [
  { field: "TICKET_ID", headerName: "Ticket ID", width: 110 },
  { field: "TITLE", headerName: "Title", width: 320 },
  {
    field: "STATUS_NAME",
    headerName: "Status",
    width: 190,
    renderCell: (params) => (
      <Chip
        label={params.value}
        size="small"
        color="success"
        variant="contained"
      />
    ),
  },
  { field: "REMARKS", headerName: "Remarks", flex: 1 },
  {
    field: "CREATED_AT",
    headerName: "Created Date",
    width: 160,
    renderCell: (params) => dayjs(params.value).format("DD-MMM-YYYY"),
  },
  {
    field: "COMPLETED_AT",
    headerName: "Completed Date",
    width: 160,
  },
];

export default function CompletedTickets() {
  const [tickets, setTickets] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const custID = secureLocalStorage.getItem("USER_ID");
  const cust_dept_id = secureLocalStorage.getItem("DEPT_ID");
  const login_id = secureLocalStorage.getItem("CUST_LOGIN_ID");

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await GetTickets(custID, cust_dept_id, login_id);
      const completedOnly = (res?.items ?? []).filter(
        (t) => t.STATUS_ID === 12,
      );
      setTickets(completedOnly);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSearch = () => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    setAppliedFrom("");
    setAppliedTo("");
  };

  const filteredTickets = useMemo(() => {
    let result = tickets;

    if (appliedFrom) {
      const from = dayjs(appliedFrom).startOf("day");
      result = result.filter(
        (t) => t.COMPLETED_AT && dayjs(t.COMPLETED_AT).isSameOrAfter(from),
      );
    }

    if (appliedTo) {
      const to = dayjs(appliedTo).endOf("day");
      result = result.filter(
        (t) => t.COMPLETED_AT && dayjs(t.COMPLETED_AT).isSameOrBefore(to),
      );
    }

    return result;
  }, [tickets, appliedFrom, appliedTo]);

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 1.5, borderRadius: 2, mb: 2, color: "#c782f5" }}>
        <Typography variant="h4" fontWeight={600}>
          COMPLETED TICKETS
        </Typography>
      </Paper>

      {/* Filter Row */}
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <DatePicker
            label="From Date"
            format="DD-MMM-YYYY"
            value={fromDate ? dayjs(fromDate) : null}
            onChange={(val) => setFromDate(val ? val.format("YYYY-MM-DD") : "")}
            maxDate={toDate ? dayjs(toDate) : undefined}
            slotProps={{
              textField: { size: "small", sx: { width: 180 } },
            }}
          />
          <DatePicker
            label="To Date"
            format="DD-MMM-YYYY"
            value={toDate ? dayjs(toDate) : null}
            onChange={(val) => setToDate(val ? val.format("YYYY-MM-DD") : "")}
            minDate={fromDate ? dayjs(fromDate) : undefined}
            slotProps={{
              textField: { size: "small", sx: { width: 180 } },
            }}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
          >
            Search
          </Button>
          {(appliedFrom || appliedTo) && (
            <Button variant="outlined" color="error" onClick={handleClear}>
              Clear
            </Button>
          )}
        </Stack>
      </LocalizationProvider>

      {/* Grid */}
      {/* Grid */}
      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ px: 1.5, pt: 1 }}>
            {/* Header skeleton — mirrors DataGrid columns */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                pb: 1,
                mb: 0.5,
                borderBottom: "2px solid",
                borderColor: "divider",
              }}
            >
              {[110, 320, 190, 200, 160, 160].map((w, i) => (
                <Skeleton
                  key={i}
                  variant="text"
                  width={w}
                  height={22}
                  sx={{ flexShrink: 0 }}
                />
              ))}
            </Box>

            {/* Row skeletons */}
            {Array.from({ length: 8 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  height: 52,
                  borderBottom: "1px solid",
                  borderColor: "grey.100",
                }}
              >
                {/* Ticket ID */}
                <Skeleton
                  variant="text"
                  width={70}
                  height={18}
                  sx={{ flexShrink: 0 }}
                />
                {/* Title */}
                <Skeleton
                  variant="text"
                  width={`${40 + (i % 4) * 10}%`}
                  height={18}
                  sx={{ flexShrink: 0, maxWidth: 320 }}
                />
                {/* Status chip */}
                <Skeleton
                  variant="rounded"
                  width={110}
                  height={24}
                  sx={{ borderRadius: "16px", flexShrink: 0 }}
                />
                {/* Remarks — flex */}
                <Skeleton variant="text" height={18} sx={{ flex: 1 }} />
                {/* Created Date */}
                <Skeleton
                  variant="text"
                  width={100}
                  height={18}
                  sx={{ flexShrink: 0 }}
                />
                {/* Completed Date */}
                <Skeleton
                  variant="text"
                  width={100}
                  height={18}
                  sx={{ flexShrink: 0 }}
                />
              </Box>
            ))}

            {/* Pagination skeleton */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 1.5,
                py: 1.5,
                px: 1,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Skeleton variant="text" width={140} height={20} />
              <Skeleton variant="rounded" width={72} height={30} />
            </Box>
          </Box>
        ) : (
          <DataGrid
            rows={filteredTickets}
            columns={columns}
            pageSize={10}
            getRowId={(row) => row.TICKET_ID}
            rowsPerPageOptions={[10, 25, 50]}
            autoHeight
            disableSelectionOnClick
          />
        )}
      </Paper>
    </Box>
  );
}
