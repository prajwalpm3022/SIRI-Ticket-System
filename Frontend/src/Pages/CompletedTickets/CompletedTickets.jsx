import React, { useMemo } from "react";
import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Skeleton,
  Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { DataGrid } from "@mui/x-data-grid";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useQuery } from "@tanstack/react-query";
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
    field: "COMPLETED_DATE",
    headerName: "Completed Date",
    width: 160,
    renderCell: (params) => dayjs(params.value).format("DD-MMM-YYYY"),
  },
];

export default function CompletedTickets() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const custID = secureLocalStorage.getItem("USER_ID");
  const cust_dept_id = secureLocalStorage.getItem("DEPT_ID");
  const login_id = secureLocalStorage.getItem("CUST_LOGIN_ID");

  const { data: tickets = [], isFetching: loading } = useQuery({
    queryKey: ["completedTickets", custID, cust_dept_id, login_id],
    queryFn: async () => {
      const res = await GetTickets(custID, cust_dept_id, login_id);
      return (res?.items ?? []).filter((t) => t.STATUS_ID === 12);
    },
  });

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
        (t) => t.COMPLETED_DATE && dayjs(t.COMPLETED_DATE).isSameOrAfter(from),
      );
    }
    if (appliedTo) {
      const to = dayjs(appliedTo).endOf("day");
      result = result.filter(
        (t) => t.COMPLETED_DATE && dayjs(t.COMPLETED_DATE).isSameOrBefore(to),
      );
    }
    return result;
  }, [tickets, appliedFrom, appliedTo]);

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 1.5, borderRadius: 2, mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          COMPLETED TICKETS
        </Typography>
      </Paper>

      {/* Filter Row */}
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <DatePicker
              label="From Date"
              format="DD-MMM-YYYY"
              value={fromDate ? dayjs(fromDate) : null}
              onChange={(val) =>
                setFromDate(val ? val.format("YYYY-MM-DD") : "")
              }
              maxDate={toDate ? dayjs(toDate) : undefined}
              slotProps={{
                textField: { size: "small", sx: { width: "100%" } },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <DatePicker
              label="To Date"
              format="DD-MMM-YYYY"
              value={toDate ? dayjs(toDate) : null}
              onChange={(val) => setToDate(val ? val.format("YYYY-MM-DD") : "")}
              minDate={fromDate ? dayjs(fromDate) : undefined}
              slotProps={{
                textField: { size: "small", sx: { width: "100%" } },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
            >
              Search
            </Button>
            {(appliedFrom || appliedTo) && (
              <Button variant="contained" color="error" onClick={handleClear}>
                Clear
              </Button>
            )}
          </Grid>
        </Grid>
      </LocalizationProvider>

      {/* Table */}
      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ px: 1.5, pt: 1 }}>
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
                <Skeleton
                  variant="text"
                  width={70}
                  height={18}
                  sx={{ flexShrink: 0 }}
                />
                <Skeleton
                  variant="text"
                  width={`${40 + (i % 4) * 10}%`}
                  height={18}
                  sx={{ flexShrink: 0, maxWidth: 320 }}
                />
                <Skeleton
                  variant="rounded"
                  width={110}
                  height={24}
                  sx={{ borderRadius: "16px", flexShrink: 0 }}
                />
                <Skeleton variant="text" height={18} sx={{ flex: 1 }} />
                <Skeleton
                  variant="text"
                  width={100}
                  height={18}
                  sx={{ flexShrink: 0 }}
                />
                <Skeleton
                  variant="text"
                  width={100}
                  height={18}
                  sx={{ flexShrink: 0 }}
                />
              </Box>
            ))}

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
