import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Avatar,
  TextField,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SearchIcon from "@mui/icons-material/Search";
import { io } from "socket.io-client";
import { GetChatMembers } from "../../Services/TicketChat.Services";
import secureLocalStorage from "react-secure-storage";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:8000", {
  autoConnect: false,
});

const USER_TYPE_LABEL = {
  CU: "Module User",
  SH: "Section Head",
  A: "Admin",
  EN: "Engineer",
  SA: "Siri Admin",
};

const USER_TYPE_COLOR = {
  CU: { bg: "#e8f5e9", color: "#1b5e20", border: "rgba(27,94,32,0.2)" },
  SH: { bg: "#e3f2fd", color: "#0d47a1", border: "rgba(13,71,161,0.2)" },
  A: { bg: "#fff3e0", color: "#bf360c", border: "rgba(191,54,12,0.2)" },
  EN: { bg: "#ede7f6", color: "#311b92", border: "rgba(49,27,146,0.2)" },
  SA: { bg: "#fce4ec", color: "#6a0036", border: "rgba(106,0,54,0.2)" },
};

const AVATAR_COLOR_BY_TYPE = {
  CU: "#2e7d32",
  SH: "#1565c0",
  A: "#e65100",
  EN: "#4527a0",
  SA: "#880e4f",
};

const ACCENT = "#6F60C1";

const getTypeStyle = (t) =>
  USER_TYPE_COLOR[t] || {
    bg: "#f5f5f5",
    color: "#616161",
    border: "rgba(0,0,0,0.1)",
  };
const getAvatarColor = (t) => AVATAR_COLOR_BY_TYPE[t] || ACCENT;
const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatMessage = (row, currentUserId, members) => {
  const senderId = row.SENDER_ID ?? row.sender_id ?? row.senderId;
  const senderType = row.SENDER_TYPE ?? row.sender_type ?? row.senderType;
  const text = row.MESSAGE_TEXT ?? row.message_text ?? row.text ?? "";
  const createdTime = row.CREATED_TIME ?? row.created_time ?? row.time ?? "";
  const messageId =
    row.MESSAGE_ID ??
    row.message_id ??
    row.messageId ??
    `${senderId}_${createdTime}`;

  const member = members.find((m) => String(m.USER_ID) === String(senderId));
  const senderName = member?.MEMBER_NAME ?? `User #${senderId}`;

  const isOwn =
    senderId != null &&
    currentUserId != null &&
    String(senderId).trim() === String(currentUserId).trim();

  return {
    sender: isOwn ? "user" : "other",
    text,
    time: createdTime,
    senderName,
    senderType,
    senderId,
    messageId,
  };
};

// ── TypingIndicator ───────────────────────────────────────────────────────────
const TypingIndicator = ({ name = "?", senderType = "CU" }) => (
  <Box display="flex" alignItems="flex-end" gap={1}>
    <Avatar
      sx={{
        width: 28,
        height: 28,
        bgcolor: getAvatarColor(senderType),
        fontSize: "0.72rem",
      }}
    >
      {name.charAt(0).toUpperCase()}
    </Avatar>
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: "14px 14px 14px 4px",
        bgcolor: "#fff",
        border: "0.5px solid rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 0.5,
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: "#bdbdbd",
            animation: "bounce 1.2s infinite ease-in-out",
            animationDelay: `${i * 0.2}s`,
            "@keyframes bounce": {
              "0%,80%,100%": { transform: "scale(0.7)", opacity: 0.5 },
              "40%": { transform: "scale(1)", opacity: 1 },
            },
          }}
        />
      ))}
    </Box>
  </Box>
);

// ── ChatMessage ───────────────────────────────────────────────────────────────
const ChatMessage = ({ msg }) => {
  const isUser = msg.sender === "user";
  const typeStyle = getTypeStyle(msg.senderType);
  const displayName = isUser ? "You" : msg.senderName || "Unknown";

  return (
    <Box
      display="flex"
      flexDirection={isUser ? "row-reverse" : "row"}
      alignItems="flex-end"
      gap={1}
      sx={{ px: 0.5 }}
    >
      {!isUser && (
        <Tooltip
          title={`${msg.senderName} · ${USER_TYPE_LABEL[msg.senderType] || msg.senderType}`}
        >
          <Avatar
            sx={{
              width: 28,
              height: 28,
              bgcolor: getAvatarColor(msg.senderType),
              fontSize: "0.72rem",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getInitials(msg.senderName)}
          </Avatar>
        </Tooltip>
      )}

      <Box sx={{ maxWidth: "72%" }}>
        {/* Name + badge */}
        <Box
          display="flex"
          alignItems="center"
          gap={0.5}
          sx={{
            px: 0.5,
            mb: 0.4,
            justifyContent: isUser ? "flex-end" : "flex-start",
          }}
        >
          {isUser ? (
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.disabled"
              fontSize={10}
            >
              You
            </Typography>
          ) : (
            <>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                fontSize={11}
                noWrap
              >
                {displayName}
              </Typography>
              {msg.senderType && (
                <Box
                  component="span"
                  sx={{
                    px: 0.8,
                    py: 0.1,
                    borderRadius: "6px",
                    fontSize: 9,
                    fontWeight: 700,
                    bgcolor: typeStyle.bg,
                    color: typeStyle.color,
                    border: `0.5px solid ${typeStyle.border}`,
                    flexShrink: 0,
                  }}
                >
                  {USER_TYPE_LABEL[msg.senderType] || msg.senderType}
                </Box>
              )}
            </>
          )}
        </Box>

        {/* Bubble */}
        <Box
          sx={{
            px: 1.6,
            py: 1,
            borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
            bgcolor: isUser ? ACCENT : "#fff",
            color: isUser ? "#fff" : "text.primary",
            border: isUser ? "none" : "0.5px solid rgba(0,0,0,0.07)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          <Typography
            variant="body2"
            fontSize={13}
            sx={{ wordBreak: "break-word", lineHeight: 1.5 }}
          >
            {msg.text}
          </Typography>
        </Box>

        {/* Timestamp */}
        <Box
          sx={{
            px: 0.5,
            mt: 0.3,
            display: "flex",
            alignItems: "center",
            justifyContent: isUser ? "flex-end" : "flex-start",
          }}
        >
          <Typography variant="caption" fontSize={10} color="text.secondary">
            {msg.time}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// ── MembersPanel ──────────────────────────────────────────────────────────────
const MembersPanel = ({
  open,
  onClose,
  members = [],
  membersLoading,
  ticketId,
  onlineUserIds,
}) => {
  const [search, setSearch] = useState("");

  const filtered = members.filter(
    (m) =>
      (m.MEMBER_NAME || "").toLowerCase().includes(search.toLowerCase()) ||
      (USER_TYPE_LABEL[m.USER_TYPE] || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const hasSocketData = onlineUserIds.size > 0;
  const isOnlineFn = (m) =>
    hasSocketData ? onlineUserIds.has(String(m.USER_ID)) : m.ACTIVE === "Y";
  const online = filtered.filter((m) => isOnlineFn(m));
  const offline = filtered.filter((m) => !isOnlineFn(m));

  const MemberRow = ({ m }) => {
    const style = getTypeStyle(m.USER_TYPE);
    const name = m.MEMBER_NAME || `User #${m.USER_ID}`;
    const isOnline = isOnlineFn(m);
    return (
      <Box
        display="flex"
        alignItems="center"
        gap={1.5}
        sx={{
          px: 2,
          py: 1.2,
          transition: "background 0.12s",
          "&:hover": { bgcolor: "rgba(111,96,193,0.04)" },
          cursor: "default",
        }}
      >
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            sx={{
              width: 38,
              height: 38,
              bgcolor: getAvatarColor(m.USER_TYPE),
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            {getInitials(name)}
          </Avatar>
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 11,
              height: 11,
              borderRadius: "50%",
              bgcolor: isOnline ? "#4caf50" : "#bdbdbd",
              border: "2px solid #fff",
              zIndex: 1,
              ...(isOnline && {
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: -3,
                  borderRadius: "50%",
                  border: "2px solid #4caf50",
                  opacity: 0,
                  animation: "onlinePulse 2s ease-out infinite",
                },
                "@keyframes onlinePulse": {
                  "0%": { transform: "scale(0.8)", opacity: 0.8 },
                  "100%": { transform: "scale(2)", opacity: 0 },
                },
              }),
            }}
          />
        </Box>
        <Box flex={1} minWidth={0}>
          <Typography
            variant="body2"
            fontWeight={600}
            fontSize={13}
            noWrap
            color="text.primary"
          >
            {name}
          </Typography>
          <Box
            component="span"
            sx={{
              mt: 0.3,
              display: "inline-block",
              px: 0.9,
              py: 0.15,
              borderRadius: "8px",
              fontSize: 10,
              fontWeight: 700,
              bgcolor: style.bg,
              color: style.color,
              border: `0.5px solid ${style.border}`,
            }}
          >
            {USER_TYPE_LABEL[m.USER_TYPE] || m.USER_TYPE}
          </Box>
          <Typography
            variant="caption"
            display="block"
            fontSize={10}
            fontWeight={500}
            sx={{ color: isOnline ? "#2e7b32" : "text.disabled", mt: 0.2 }}
          >
            {isOnline ? "● online" : "○ offline"}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 10,
        borderRadius: "inherit",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1.2,
          background: "linear-gradient(135deg, #6F60C1, #8f7df0)",
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.18)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.28)" },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <PeopleAltIcon sx={{ color: "#fff", fontSize: 18 }} />
        <Box>
          <Typography fontWeight={700} color="#fff" fontSize="0.88rem">
            Chat Members
          </Typography>
          <Typography fontSize="0.7rem" color="rgba(255,255,255,0.75)">
            Ticket #{ticketId} · {members.length} participant
            {members.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: "0.5px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{
            px: 1.2,
            py: 0.6,
            borderRadius: "20px",
            border: "0.5px solid",
            borderColor: "divider",
            bgcolor: "grey.50",
            "&:focus-within": { borderColor: ACCENT },
          }}
        >
          <SearchIcon sx={{ fontSize: 15, color: "text.secondary" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 12,
              flex: 1,
              color: "inherit",
            }}
          />
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {membersLoading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height={120}
          >
            <CircularProgress size={24} sx={{ color: ACCENT }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height={120}
            gap={1}
          >
            <PeopleAltIcon sx={{ fontSize: 36, opacity: 0.15 }} />
            <Typography variant="body2" color="text.secondary" fontSize={12}>
              No members found
            </Typography>
          </Box>
        ) : (
          <>
            {online.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    px: 2,
                    pt: 1.2,
                    pb: 0.4,
                    display: "block",
                    fontWeight: 700,
                    fontSize: 10,
                    color: "text.secondary",
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  Online — {online.length}
                </Typography>
                {online.map((m, i) => (
                  <MemberRow key={m.CHAT_MEMBER_ID || i} m={m} />
                ))}
              </>
            )}
            {offline.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    px: 2,
                    pt: 1.4,
                    pb: 0.4,
                    display: "block",
                    fontWeight: 700,
                    fontSize: 10,
                    color: "text.secondary",
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  Offline — {offline.length}
                </Typography>
                {offline.map((m, i) => (
                  <MemberRow key={m.CHAT_MEMBER_ID || i} m={m} />
                ))}
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

// ── TicketChat (Main) ─────────────────────────────────────────────────────────
const TicketChat = ({
  open,
  onClose,
  ticketId,
  ticketTitle,
  currentUserType = "CU",
}) => {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const chatEndRef = useRef(null);

  const rawId = secureLocalStorage.getItem("CUST_LOGIN_ID");
  const currentUserId = rawId != null ? String(rawId) : null;

  const currentUserName = useMemo(() => {
    if (members.length > 0 && currentUserId) {
      const me = members.find((m) => String(m.USER_ID) === currentUserId);
      if (me?.MEMBER_NAME) return me.MEMBER_NAME;
    }
    return `User ${currentUserId}`;
  }, [members, currentUserId]);

  const userType = secureLocalStorage.getItem("LOGIN_TYPE") || currentUserType;

  const getMembers = async (id) => {
    setMembersLoading(true);
    try {
      const res = await GetChatMembers(id);
      const data = res?.items?.members || [];
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !ticketId) return;

    setMessages([]);
    setMembersOpen(false);
    setOnlineUserIds(new Set());
    getMembers(ticketId);

    const joinPayload = { ticketId, userId: currentUserId, userType };
    if (socket.connected) {
      socket.emit("join_ticket", joinPayload);
    } else {
      socket.connect();
      socket.once("connect", () => socket.emit("join_ticket", joinPayload));
    }

    socket.on("message_history", (rows) => {
      setMembers((currentMembers) => {
        setMessages(
          rows.map((row) => formatMessage(row, currentUserId, currentMembers)),
        );
        return currentMembers;
      });
      setConnected(true);
    });

    socket.on("new_message", (msg) => {
      setMembers((currentMembers) => {
        const formatted = formatMessage(msg, currentUserId, currentMembers);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (
            last?.text === formatted.text &&
            last?.senderId === formatted.senderId &&
            last?.time === formatted.time
          )
            return prev;
          return [...prev, formatted];
        });
        return currentMembers;
      });
    });

    socket.on("room_online_users", ({ userIds }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(userIds.map(String));
        if (currentUserId) next.add(currentUserId);
        return next;
      });
    });
    socket.on("user_joined", ({ userId }) =>
      setOnlineUserIds((prev) => new Set([...prev, String(userId)])),
    );
    socket.on("user_left", ({ userId }) => {
      setOnlineUserIds((prev) => {
        const n = new Set(prev);
        n.delete(String(userId));
        return n;
      });
    });
    if (currentUserId)
      setOnlineUserIds((prev) => new Set([...prev, currentUserId]));

    socket.on("chat_error", ({ message }) =>
      console.error("Chat error:", message),
    );
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.emit("leave_ticket", { ticketId, userId: currentUserId });
      socket.off("message_history");
      socket.off("new_message");
      socket.off("room_online_users");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("chat_error");
      socket.off("connect");
      socket.off("disconnect");
      socket.disconnect();
      setConnected(false);
      setOnlineUserIds(new Set());
    };
  }, [open, ticketId]);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({
        behavior: "auto",
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [messages.length, open]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !connected) return;
    socket.emit("send_message", {
      ticketId,
      senderId: currentUserId,
      senderType: userType,
      text,
    });
    setInputText("");
  }, [inputText, connected, ticketId, currentUserId, userType]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const typeStyle = getTypeStyle(userType);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          boxShadow: "-4px 0 24px rgba(111,96,193,0.15)",
          zIndex: 1300,
          overflow: "hidden",
        },
      }}
      sx={{ zIndex: 1300 }}
    >
      <Box
        sx={{
          width: 380,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            background: "linear-gradient(135deg, #6F60C1, #8f7df0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChatIcon sx={{ color: "#fff", fontSize: 17 }} />
            </Box>
            <Box>
              <Box display="flex" alignItems="center" gap={0.8}>
                <Typography fontWeight={700} color="#fff" fontSize="0.9rem">
                  Ticket Chat
                </Typography>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: connected ? "#4caf50" : "#ff7043",
                    boxShadow: connected
                      ? "0 0 0 2px rgba(76,175,80,0.35)"
                      : "none",
                  }}
                />
              </Box>
              <Typography
                fontSize="0.7rem"
                color="rgba(255,255,255,0.8)"
                noWrap
              >
                #{ticketId} · {ticketTitle || "—"}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={0.8}>
            <Tooltip title="View members">
              <Box
                onClick={() => setMembersOpen(true)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.6,
                  px: 1.2,
                  py: 0.5,
                  borderRadius: "20px",
                  bgcolor: "rgba(255,255,255,0.18)",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.28)" },
                  transition: "background 0.15s",
                }}
              >
                {membersLoading ? (
                  <CircularProgress size={13} sx={{ color: "#fff" }} />
                ) : (
                  <PeopleAltIcon sx={{ color: "#fff", fontSize: 14 }} />
                )}
                <Typography fontSize={12} fontWeight={500} color="#fff">
                  Members
                </Typography>
                {members.length > 0 && !membersLoading && (
                  <Box
                    sx={{
                      bgcolor: "#4caf50",
                      borderRadius: "10px",
                      px: 0.6,
                      minWidth: 17,
                      height: 17,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      fontSize={9}
                      fontWeight={700}
                      color="#fff"
                      lineHeight={1}
                    >
                      {members.length}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Tooltip>
            <IconButton onClick={onClose} size="small" sx={{ color: "#fff" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Identity bar */}
        <Box
          sx={{
            px: 2,
            py: 0.8,
            bgcolor: "#ede9fb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            borderBottom: "0.5px solid rgba(111,96,193,0.12)",
          }}
        >
          <Box display="flex" alignItems="center" gap={0.8}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: getAvatarColor(userType),
                fontSize: "0.68rem",
                fontWeight: 700,
              }}
            >
              {currentUserName?.charAt(0).toUpperCase()}
            </Avatar>
            <Typography
              variant="caption"
              fontWeight={700}
              color="#3d2f8f"
              noWrap
            >
              {currentUserName}
            </Typography>
          </Box>
          <Box
            sx={{
              px: 1,
              py: 0.2,
              borderRadius: "8px",
              bgcolor: typeStyle.bg,
              border: `0.5px solid ${typeStyle.border}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: 10,
                color: typeStyle.color,
                letterSpacing: 0.3,
              }}
            >
              {USER_TYPE_LABEL[userType] || userType}
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* Messages */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            bgcolor: "#f4f2fb",
          }}
        >
          {messages.length === 0 ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
              gap={1}
            >
              <ChatIcon sx={{ fontSize: 44, opacity: 0.12, color: ACCENT }} />
              <Typography
                variant="body2"
                textAlign="center"
                color="text.secondary"
                fontSize={13}
              >
                No messages yet.
                <br />
                Start the conversation!
              </Typography>
            </Box>
          ) : (
            messages.map((msg) => <ChatMessage key={msg.messageId} msg={msg} />)
          )}
          <div ref={chatEndRef} />
        </Box>

        <Divider />

        {/* Input */}
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            gap: 1,
            bgcolor: "#fff",
            flexShrink: 0,
            alignItems: "flex-end",
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            multiline
            maxRows={3}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "20px",
                fontSize: "0.85rem",
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!inputText.trim() || !connected}
            sx={{
              bgcolor: ACCENT,
              color: "#fff",
              borderRadius: "50%",
              width: 38,
              height: 38,
              flexShrink: 0,
              "&:hover": { bgcolor: "#5a4daa" },
              "&:disabled": { bgcolor: "#e0e0e0", color: "#bdbdbd" },
              transition: "background 0.2s, transform 0.1s",
              "&:active": { transform: "scale(0.93)" },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>

        <MembersPanel
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          members={members}
          membersLoading={membersLoading}
          ticketId={ticketId}
          onlineUserIds={onlineUserIds}
        />
      </Box>
    </Drawer>
  );
};

export default TicketChat;
