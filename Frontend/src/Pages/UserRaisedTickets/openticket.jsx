import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Badge,
  Fade,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import CloseIcon from "@mui/icons-material/Close";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GetTickets } from "../../Services/AdminDashBoard.services";
import {
  getclientnotification,
  markclientNotificationViewed,
} from "../../Services/notification.service";
import secureLocalStorage from "react-secure-storage";
import TicketFilter from "./ticketfilter";
import TicketGrid from "./ticketgrid";

const SEND_TO_TYPE = "CUST";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " | " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
};

// ─── Notification Popup ───────────────────────────────────────────────────────
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
    refetchInterval: 30 * 1000,
  });

  const unreadCount = notifications.filter((n) => !n.VIEWED_ON).length;

  // DOM event listener — stays as useEffect
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
                ? "rgba(111,96,193,0.18)"
                : "rgba(111,96,193,0.08)",
              color: "#6F60C1",
              border: "1.5px solid rgba(111,96,193,0.35)",
              backdropFilter: "blur(6px)",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "rgba(111,96,193,0.18)",
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OpenTickets() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterDate, setFilterDate] = useState(null);

  const cust_id = secureLocalStorage.getItem("USER_ID");
  const cust_dept_id = secureLocalStorage.getItem("DEPT_ID");
  const cust_login_id = secureLocalStorage.getItem("CUST_LOGIN_ID");
  const deptName = secureLocalStorage.getItem("DEPT_NAME");
  const custLoginId = secureLocalStorage.getItem("CUST_LOGIN_ID");

  const {
    data: tickets = [],
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: ["openTickets", cust_id, cust_dept_id, cust_login_id],
    queryFn: async () => {
      const res = await GetTickets(cust_id, cust_dept_id, cust_login_id);
      return res?.items || [];
    },
    enabled: !!cust_id && !!cust_dept_id && !!cust_login_id,
  });

  const handleSearch = () => setFilterDate(selectedDate);
  const handleClear = () => {
    setSelectedDate(null);
    setFilterDate(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        sx={{
          p: 1,
          px: 2,
          borderRadius: 2,
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          RAISED TICKETS - {deptName}
        </Typography>
        <NotificationBell custLoginId={custLoginId} />
      </Paper>

      <Box sx={{ mb: 4 }}>
        <TicketFilter
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onSearch={handleSearch}
          onClear={handleClear}
        />
      </Box>

      <TicketGrid
        tickets={tickets}
        selectedDate={filterDate}
        loading={loading}
        onRefresh={refetch}
      />
    </Box>
  );
}
