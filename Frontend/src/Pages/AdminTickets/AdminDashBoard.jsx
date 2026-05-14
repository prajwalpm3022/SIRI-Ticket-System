import { useState, useRef, useEffect } from "react";
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
  Badge,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GetTicketsForAdmin,
  GetTicketDD,
} from "../../Services/AdminDashBoard.services";
import {
  getclientnotification,
  markclientNotificationViewed,
} from "../../Services/notification.service";
import secureLocalStorage from "react-secure-storage";

const SEND_TO_TYPE = "CUST";

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
  14: "#26c6da",
};

const getStatusInfo = (statusId, statusList = []) => {
  if (statusId === null || statusId === undefined)
    return { label: "Pending", color: STATUS_COLOR_MAP["null"] };
  const found = statusList.find((s) => s.TICKET_STATUS_ID === statusId);
  return {
    label: found ? found.STATUS : "Unknown",
    color: STATUS_COLOR_MAP[statusId] ?? "#bdbdbd",
  };
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " | " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
};

// ─── Notification Detail Popup ────────────────────────────────────────────────
function NotificationPopup({ open, onClose, notification }) {
  if (!notification) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          border: "2px solid #6F60C1",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "#6F60C1",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 1.5,
          px: 2.5,
        }}
      >
        <NotificationsActiveIcon fontSize="small" />
        <Typography fontWeight={700} fontSize={16} flex={1}>
          Notification Detail
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 1, px: 3 }}>
        <Typography fontSize={15} fontWeight={600} mb={2} color="text.primary">
          {notification.NOTIFICATION}
        </Typography>
        <Typography fontSize={13} color="text.secondary">
          Sent: {formatDate(notification.SENT_DATE)}
        </Typography>
        {notification.VIEWED_ON && (
          <Typography fontSize={12} color="text.disabled" mt={0.5}>
            Viewed: {formatDate(notification.VIEWED_ON)}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onClose}
          variant="contained"
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
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Notification Bell ────────────────────────────────────────────────────────
function NotificationBell({ custLoginId }) {
  const [open, setOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [openPopup, setOpenPopup] = useState(false);
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: notifications = [], isFetching: loading } = useQuery({
    queryKey: ["notifications", custLoginId],
    queryFn: async () => {
      const res = await getclientnotification(custLoginId, SEND_TO_TYPE);
      return res?.items || [];
    },
    enabled: !!custLoginId,
    refetchInterval: 30 * 1000, // auto-refresh every 30s
  });

  const unreadCount = notifications.filter((n) => !n.VIEWED_ON).length;

  // Click outside handler — stays as useEffect (DOM event listener)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleBellClick = () => {
    setOpen((prev) => !prev);
    if (!open)
      queryClient.invalidateQueries({
        queryKey: ["notifications", custLoginId],
      });
  };

  const handleNotifClick = async (notif) => {
    setSelectedNotif(notif);
    setOpenPopup(true);
    setOpen(false);

    if (!notif.VIEWED_ON) {
      try {
        await markclientNotificationViewed(notif.NOTIFICATION_ID);
        // Optimistic update — update cache directly without refetch
        queryClient.setQueryData(["notifications", custLoginId], (prev = []) =>
          prev.map((n) =>
            n.NOTIFICATION_ID === notif.NOTIFICATION_ID
              ? { ...n, VIEWED_ON: new Date().toISOString() }
              : n,
          ),
        );
      } catch (err) {
        console.error("Failed to mark notification as viewed:", err);
      }
    }
  };

  const handlePopupClose = () => {
    setOpenPopup(false);
    queryClient.invalidateQueries({ queryKey: ["notifications", custLoginId] });
  };

  return (
    <>
      <Box ref={dropdownRef} sx={{ position: "relative" }}>
        <Tooltip title="Notifications" placement="bottom">
          <IconButton
            onClick={handleBellClick}
            sx={{
              width: 42,
              height: 42,
              background: open
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1.5px solid rgba(255,255,255,0.35)",
              backdropFilter: "blur(6px)",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "rgba(255,255,255,0.28)",
                transform: "scale(1.07)",
              },
            }}
          >
            <Badge
              badgeContent={unreadCount}
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: "#ef5350",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 10,
                  minWidth: 17,
                  height: 17,
                },
              }}
            >
              <NotificationsActiveIcon sx={{ fontSize: 22 }} />
            </Badge>
          </IconButton>
        </Tooltip>

        <Fade in={open}>
          <Paper
            elevation={10}
            sx={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              width: 360,
              maxHeight: 460,
              borderRadius: "16px",
              border: "2px solid #6F60C1",
              overflow: "hidden",
              display: open ? "flex" : "none",
              flexDirection: "column",
              zIndex: 1400,
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.4,
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                backgroundColor: "#6F60C1",
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <NotificationsActiveIcon sx={{ color: "#fff", fontSize: 16 }} />
              </Box>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ color: "#fff", flex: 1, fontSize: 15 }}
              >
                Notifications
              </Typography>
              {notifications.length > 0 && (
                <Box
                  sx={{
                    backgroundColor: "#fff",
                    color: "#6F60C1",
                    borderRadius: "12px",
                    px: 1.2,
                    py: 0.15,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {notifications.length}
                </Box>
              )}
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                sx={{ color: "#fff", ml: 0.5 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ overflowY: "auto", p: 1.5, flex: 1 }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                  <CircularProgress sx={{ color: "#6F60C1" }} size={26} />
                </Box>
              ) : notifications.length === 0 ? (
                <Box sx={{ textAlign: "center", mt: 5 }}>
                  <NotificationsNoneIcon sx={{ fontSize: 40, color: "#ccc" }} />
                  <Typography color="text.secondary" fontSize={13} mt={1}>
                    No notifications yet
                  </Typography>
                </Box>
              ) : (
                notifications.map((item, index) => (
                  <Paper
                    key={item.NOTIFICATION_ID ?? index}
                    onClick={() => handleNotifClick(item)}
                    sx={{
                      mb: 1.2,
                      p: 1.5,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderRadius: "10px",
                      cursor: "pointer",
                      border: "1px solid #6F60C1",
                      borderLeft: "4px solid #6F60C1",
                      backgroundColor: item.VIEWED_ON
                        ? "inherit"
                        : "rgba(111,96,193,0.06)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                      transition: "0.2s ease",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.13)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {!item.VIEWED_ON && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: "#6F60C1",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Typography
                        fontSize={13}
                        fontWeight={600}
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.NOTIFICATION}
                      </Typography>
                    </Box>
                    <Typography
                      fontSize={11}
                      fontWeight={600}
                      color="#6F60C1"
                      sx={{ whiteSpace: "nowrap", ml: 1.5, flexShrink: 0 }}
                    >
                      {formatDate(item.SENT_DATE)}
                    </Typography>
                  </Paper>
                ))
              )}
            </Box>
          </Paper>
        </Fade>
      </Box>

      <NotificationPopup
        open={openPopup}
        onClose={handlePopupClose}
        notification={selectedNotif}
      />
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const AdminDashBoard = () => {
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({
    from: null,
    to: null,
    dept: null,
    status: null,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const navigate = useNavigate();
  const userId = secureLocalStorage.getItem("USER_ID");
  const custLoginId = secureLocalStorage.getItem("CUST_LOGIN_ID");

  // ─── Ticket statuses — cached 5min ────────────────────────
  const { data: ticketStatuses = [] } = useQuery({
    queryKey: ["ticketStatuses"],
    queryFn: async () => {
      const res = await GetTicketDD();
      return res?.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─── Admin tickets — refetch on appliedFilters change ─────
  const { data: adminTickets = [], isFetching: loading } = useQuery({
    queryKey: ["adminTickets", appliedFilters],
    queryFn: async () => {
      const { from, to, dept, status } = appliedFilters;
      const res = await GetTicketsForAdmin(
        userId,
        from ? from.format("YYYY-MM-DD") : null,
        to ? to.format("YYYY-MM-DD") : null,
        dept ? dept.id : null,
        status ? status.TICKET_STATUS_ID : null,
      );
      return res?.items || [];
    },
    enabled: !!userId,
  });

  // Build dept list from unfiltered tickets
  const departments = (() => {
    if (
      appliedFilters.from ||
      appliedFilters.to ||
      appliedFilters.dept ||
      appliedFilters.status
    )
      return [];
    const seen = new Map();
    adminTickets.forEach((t) => {
      const id = t.CUSTOMER_DEPT_ID;
      const name = t.CUST_DEPT_NAME?.trim();
      if (id && name && !seen.has(id)) seen.set(id, { id, name });
    });
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  })();

  const handleSearch = () => {
    setPage(0);
    setAppliedFilters({
      from: fromDate,
      to: toDate,
      dept: selectedDept,
      status: selectedStatus,
    });
  };

  const handleClearFilters = () => {
    setSelectedDept(null);
    setSelectedStatus(null);
    setFromDate(null);
    setToDate(null);
    setPage(0);
    setAppliedFilters({ from: null, to: null, dept: null, status: null });
  };

  const paginatedTickets = adminTickets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );
  const isFiltered = selectedDept || selectedStatus || fromDate || toDate;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ width: "100%", px: 3, py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            mb: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              background: "linear-gradient(90deg, #6F60C1, #8f7df0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Admin Dashboard
          </Typography>
          <Box
            sx={{
              background: "linear-gradient(135deg, #6F60C1, #8f7df0)",
              borderRadius: "12px",
              p: 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(111,96,193,0.35)",
            }}
          >
            <NotificationBell custLoginId={custLoginId} />
          </Box>
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
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Autocomplete
                size="small"
                fullWidth
                options={departments}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={selectedDept}
                onChange={(_, newValue) => setSelectedDept(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Department" />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <DatePicker
                label="From Date"
                format="DD-MMM-YYYY"
                value={fromDate}
                onChange={setFromDate}
                maxDate={toDate || undefined}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <DatePicker
                label="To Date"
                format="DD-MMM-YYYY"
                value={toDate}
                onChange={setToDate}
                minDate={fromDate || undefined}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Autocomplete
                size="small"
                fullWidth
                options={ticketStatuses}
                getOptionLabel={(option) =>
                  option.STATUS.charAt(0) + option.STATUS.slice(1).toLowerCase()
                }
                isOptionEqualToValue={(option, value) =>
                  option.TICKET_STATUS_ID === value.TICKET_STATUS_ID
                }
                value={selectedStatus}
                onChange={(_, newValue) => setSelectedStatus(newValue)}
                renderOption={(props, option) => (
                  <li {...props} key={option.TICKET_STATUS_ID}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                  Array.from({ length: rowsPerPage }).map((_, idx) => (
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
            count={adminTickets.length}
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
  );
};

export default AdminDashBoard;
