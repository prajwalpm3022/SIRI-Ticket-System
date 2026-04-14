import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";
import {
  GetTicketsForAdmin,
  GetTicketDD,
} from "../../Services/AdminDashBoard.services";
import secureLocalStorage from "react-secure-storage";
import { Skeleton } from "@mui/material";

const ALL_DEPARTMENTS = [
  { id: 1, name: "MIS DEPARTMENT" },
  { id: 2, name: "ACCOUNTS DEPARTMENT" },
  { id: 3, name: "MARKETING DEPARTMENT" },
  { id: 4, name: "MILKBILL DEPARTMENT" },
  { id: 5, name: "STORE DEPARTMENT" },
];

// Color map keyed by TICKET_STATUS_ID (null = Pending)
const STATUS_COLOR_MAP = {
  null: "#ff9800",
  1: "#5c6bc0",
  2: "#26a69a",
  3: "#ef5350",
  4: "#7e57c2",
  5: "#66bb6a",
  6: "#f44336",
  7: "#29b6f6",
  8: "#ffa726",
  9: "#ab47bc",
  10: "#26c6da",
  11: "#ff7043",
  12: "#4caf50",
  13: "#ec407a",
};

// statusList = ticketStatuses from API
const getStatusInfo = (statusId, statusList = []) => {
  if (statusId === null || statusId === undefined) {
    return { label: "Pending", color: STATUS_COLOR_MAP["null"] };
  }
  const found = statusList.find((s) => s.TICKET_STATUS_ID === statusId);
  return {
    label: found ? found.STATUS : "Unknown",
    color: STATUS_COLOR_MAP[statusId] ?? "#bdbdbd",
  };
};

const AdminDashBoard = () => {
  const [adminTickets, setAdminTickets] = useState([]);
  const [ticketStatuses, setTicketStatuses] = useState([]);

  const [selectedDept, setSelectedDept] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const navigate = useNavigate();
  const AdminID = secureLocalStorage.getItem("USER_ID");

  const fetchTickets = async (
    from = null,
    to = null,
    dept = null,
    status = null,
  ) => {
    try {
      setLoading(true);

      const fromStr = from ? from.format("YYYY-MM-DD") : null;
      const toStr = to ? to.format("YYYY-MM-DD") : null;

      // find dept_id from dept name
      const deptObj = ALL_DEPARTMENTS.find((d) => d.name === dept);
      const deptId = deptObj ? deptObj.id : null;

      // get status_id from selected status object
      const statusId = status ? status.TICKET_STATUS_ID : null;

      const response = await GetTicketsForAdmin(
        AdminID,
        fromStr,
        toStr,
        deptId,
        statusId,
      );
      setAdminTickets(response?.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      const response = await GetTicketDD();
      setTicketStatuses(response?.items || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStatuses();
  }, []);

  const handleSearch = async () => {
    setPage(0);
    await fetchTickets(fromDate, toDate, selectedDept, selectedStatus);
  };

  const handleClearFilters = async () => {
    setSelectedDept("");
    setSelectedStatus(null);
    setFromDate(null);
    setToDate(null);
    setPage(0);
    await fetchTickets();
  };

  // Frontend filter: dept + status (dates handled by backend)
  const filteredTickets = adminTickets;

  const paginatedTickets = filteredTickets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const isFiltered = selectedDept || selectedStatus || fromDate || toDate;

  return (
    <>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ width: "100%", px: 3, py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                background: "linear-gradient(90deg, #6F60C1, #8f7df0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 0.5,
              }}
            >
              Admin Dashboard
            </Typography>
          </Box>

          {/* Filter Bar */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 3,
              border: "1px solid rgba(111, 96, 193, 0.15)",
              background: "rgba(111, 96, 193, 0.03)",
            }}
          >
            <Grid container spacing={2} alignItems="center">
              {/* Department */}
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Autocomplete
                  size="small"
                  fullWidth
                  options={ALL_DEPARTMENTS}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  value={
                    ALL_DEPARTMENTS.find((d) => d.name === selectedDept) || null
                  }
                  onChange={(_, newValue) =>
                    setSelectedDept(newValue ? newValue.name : "")
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Department" />
                  )}
                />
              </Grid>

              {/* From Date */}
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <DatePicker
                  label="From Date"
                  format="DD-MMM-YYYY"
                  value={fromDate}
                  onChange={(newVal) => setFromDate(newVal)}
                  maxDate={toDate || undefined}
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </Grid>

              {/* To Date */}
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <DatePicker
                  label="To Date"
                  format="DD-MMM-YYYY"
                  value={toDate}
                  onChange={(newVal) => setToDate(newVal)}
                  minDate={fromDate || undefined}
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </Grid>

              {/* Ticket Status */}
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Autocomplete
                  size="small"
                  fullWidth
                  options={ticketStatuses}
                  getOptionLabel={(option) =>
                    option.STATUS.charAt(0) +
                    option.STATUS.slice(1).toLowerCase()
                  }
                  isOptionEqualToValue={(option, value) =>
                    option.TICKET_STATUS_ID === value.TICKET_STATUS_ID
                  }
                  value={selectedStatus}
                  onChange={(_, newValue) => setSelectedStatus(newValue)}
                  renderOption={(props, option) => (
                    <li {...props} key={option.TICKET_STATUS_ID}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor:
                              STATUS_COLOR_MAP[option.TICKET_STATUS_ID] ??
                              "#bdbdbd",
                            flexShrink: 0,
                          }}
                        />
                        {option.STATUS.charAt(0) +
                          option.STATUS.slice(1).toLowerCase()}
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label="Ticket Status" />
                  )}
                />
              </Grid>

              {/* Buttons */}
              <Grid
                size={{ xs: 12, sm: 6, md: 2.4 }}
                sx={{ display: "flex", gap: 1 }}
              >
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSearch}
                  disabled={loading}
                  startIcon={
                    loading ? (
                      <CircularProgress size={16} sx={{ color: "#fff" }} />
                    ) : (
                      <SearchIcon />
                    )
                  }
                  sx={{
                    background: "linear-gradient(135deg, #6F60C1, #8f7df0)",
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(111,96,193,0.3)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #5d4fb0, #7b6be0)",
                    },
                  }}
                >
                  {loading ? "Searching..." : "Search"}
                </Button>

                {isFiltered && (
                  <Tooltip title="Clear all filters">
                    <IconButton
                      onClick={handleClearFilters}
                      size="small"
                      sx={{
                        color: "#6F60C1",
                        border: "1px solid rgba(111,96,193,0.3)",
                        borderRadius: 2,
                      }}
                    >
                      <FilterAltOffIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Table */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(111, 96, 193, 0.12)",
              overflow: "hidden",
            }}
          >
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow
                    sx={{
                      background:
                        "linear-gradient(135deg, #6F60C1 0%, #8f7df0 100%)",
                    }}
                  >
                    {[
                      "#",
                      "Ticket ID",
                      "Department",
                      "Title",
                      "Created Date",
                      "Status",
                      "Action",
                    ].map((col) => (
                      <TableCell
                        key={col}
                        sx={{
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          borderBottom: "none",
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    Array.from({
                      length: paginatedTickets.length || rowsPerPage,
                    }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Skeleton variant="text" width={24} />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" width={60} />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" width={130} />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" width={200} />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" width={90} />
                        </TableCell>
                        <TableCell>
                          <Skeleton
                            variant="rounded"
                            width={80}
                            height={24}
                            sx={{ borderRadius: "6px" }}
                          />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="circular" width={28} height={28} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedTickets.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align="center"
                        sx={{ py: 6, color: "text.secondary" }}
                      >
                        <Typography variant="body1" fontWeight={500}>
                          No tickets found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTickets.map((ticket, idx) => {
                      const { label, color } = getStatusInfo(
                        ticket.STATUS_ID,
                        ticketStatuses,
                      );

                      return (
                        <TableRow
                          key={ticket.TICKET_ID || idx}
                          sx={{
                            "&:nth-of-type(even)": {
                              backgroundColor: "rgba(111, 96, 193, 0.03)",
                            },
                            "&:hover": {
                              backgroundColor: "rgba(111, 96, 193, 0.07)",
                              transition: "background 0.2s ease",
                            },
                          }}
                        >
                          <TableCell
                            sx={{ color: "text.secondary", fontSize: "0.8rem" }}
                          >
                            {page * rowsPerPage + idx + 1}
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color="#6F60C1"
                            >
                              #{ticket.TICKET_ID}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={500} noWrap>
                              {ticket.CUST_DEPT_NAME?.trim() || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ maxWidth: 260 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={ticket.TITLE}
                            >
                              {ticket.TITLE || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {ticket.CREATED_AT
                                ? dayjs(ticket.CREATED_AT).format("DD-MMM-YYYY")
                                : "—"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={
                                label.charAt(0) + label.slice(1).toLowerCase()
                              }
                              size="small"
                              sx={{
                                backgroundColor: color,
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: "0.72rem",
                                borderRadius: "6px",
                              }}
                            />
                          </TableCell>

                          <TableCell>
                            <Tooltip title="View ticket">
                              <IconButton
                                size="small"
                                onClick={() =>
                                  navigate(
                                    `/Drawer/AdminTicketView/${ticket.CUSTOMER_DEPT_ID}`,
                                    {
                                      state: {
                                        deptName: ticket.CUST_DEPT_NAME?.trim(),
                                      },
                                    },
                                  )
                                }
                                sx={{
                                  color: "#6F60C1",
                                  "&:hover": {
                                    backgroundColor: "rgba(111,96,193,0.1)",
                                  },
                                }}
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredTickets.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{
                borderTop: "1px solid rgba(111, 96, 193, 0.1)",
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                  { fontSize: "0.8rem" },
              }}
            />
          </Paper>
        </Box>
      </LocalizationProvider>
    </>
  );
};

export default AdminDashBoard;
