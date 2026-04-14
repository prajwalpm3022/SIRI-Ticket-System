import { useState, useRef } from "react";
import {
  TextField,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Grid,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Drawer,
  Divider,
  Avatar,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloseIcon from "@mui/icons-material/Close";
import ChatIcon from "@mui/icons-material/Chat";
import SendIcon from "@mui/icons-material/Send";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  PreviewTicketDocument,
  UpdateTicketStatus,
  UpdateUserTicket,
  DeleteTicketDoc,
} from "../../Services/AdminDashBoard.services";
import secureLocalStorage from "react-secure-storage";
const STATUS_MAP = {
  null: { label: "Pending", bg: "#fff3e0", color: "#e65100" },
  1: { label: "Under Review", bg: "#e8eaf6", color: "#3949ab" },
  2: { label: "Section Head Approved", bg: "#e8f5e9", color: "#2e7d32" },
  3: { label: "Section Head Rejected", bg: "#ffebee", color: "#c62828" },
  4: { label: "Siri Admin Review", bg: "#f3e5f5", color: "#6a1b9a" },
  5: { label: "Siri Admin Approved", bg: "#e8f5e9", color: "#2e7d32" },
  6: { label: "Siri Admin Rejected", bg: "#ffebee", color: "#c62828" },
  7: { label: "Assigned", bg: "#e1f5fe", color: "#0277bd" },
  8: { label: "In Progress", bg: "#fff8e1", color: "#f57f17" },
  9: { label: "Testing", bg: "#f3e5f5", color: "#7b1fa2" },
  10: { label: "Verified", bg: "#e0f7fa", color: "#00838f" },
  11: { label: "Reassigned", bg: "#fbe9e7", color: "#bf360c" },
  12: { label: "Completed", bg: "#e3f2fd", color: "#1565c0" },
  13: { label: "Attachment Required", bg: "#fce4ec", color: "#ad1457" },
};

const getStatusStyle = (statusId) => {
  const key = statusId === null || statusId === undefined ? "null" : statusId;
  return (
    STATUS_MAP[key] || { label: "Unknown", bg: "#f5f5f5", color: "#616161" }
  );
};

const UpdateTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ticket = location.state?.ticket;

  // Editable state
  const [description, setDescription] = useState(ticket?.DESCRIPTION || "");
  const [expDate, setExpDate] = useState(
    ticket?.CLI_EXCOMP_DATE ? dayjs(ticket.CLI_EXCOMP_DATE) : null,
  );
  const [errors, setErrors] = useState({});

  // Docs
  const [existingDocs, setExistingDocs] = useState(ticket?.DOCS || []);
  const [newDocs, setNewDocs] = useState([]);
  const [docsToDelete, setDocsToDelete] = useState([]);

  // Preview dialog
  const [openPreview, setOpenPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");

  // Chat drawer
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const chatEndRef = useRef(null);

  const fileInputRef = useRef();

  // ─── Chat handlers ────────────────────────────────────────────────
  const handleSend = () => {
    if (!message.trim()) return;
    const newMsg = {
      sender: "user",
      text: message.trim(),
      time: dayjs().format("hh:mm A"),
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setMessage("");
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "engineer",
          text: "Engineer is reviewing your message.",
          time: dayjs().format("hh:mm A"),
        },
      ]);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 1000);
    setTimeout(
      () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  };

  // ─── File handlers ────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 2 * 1024 * 1024;
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "text/csv",
      "text/plain",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const valid = [];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          icon: "warning",
          title: "Invalid File Type",
          text: "Please upload a valid document or image file.",
          timer: 1500,
          showConfirmButton: false,
        });
        continue;
      }
      if (file.size > maxSize) {
        Swal.fire({
          icon: "warning",
          title: "File Too Large",
          text: "File size must be less than 2 MB.",
          timer: 1500,
          showConfirmButton: false,
        });
        continue;
      }
      valid.push(file);
    }
    if (valid.length > 0) {
      setNewDocs((prev) => [
        ...prev,
        ...valid.map((f) => ({
          file: f,
          name: f.name,
          tempId: `new_${Date.now()}_${Math.random()}`,
        })),
      ]);
    }
    e.target.value = null;
  };

  const handleRemoveExisting = (doc) => {
    setDocsToDelete((prev) => [...prev, doc.TICKET_DOC_ID]);
    setExistingDocs((prev) =>
      prev.filter((d) => d.TICKET_DOC_ID !== doc.TICKET_DOC_ID),
    );
  };

  const handleRemoveNew = (tempId) => {
    setNewDocs((prev) => prev.filter((d) => d.tempId !== tempId));
  };

  // ─── Preview handlers ─────────────────────────────────────────────
  const handlePreviewExisting = async (docId, docName) => {
    try {
      const res = await PreviewTicketDocument(docId);
      const blob = new Blob([res.data], { type: res.headers["content-type"] });
      const blobUrl = URL.createObjectURL(blob);
      const ext = docName.split(".").pop().toLowerCase();
      if (["doc", "docx", "xls", "xlsx"].includes(ext)) {
        const directUrl = `${import.meta.env.VITE_API_URL}/AdminDashBoard/previewTicketDocument/${docId}`;
        setPreviewUrl(
          `https://docs.google.com/viewer?url=${encodeURIComponent(directUrl)}&embedded=true`,
        );
        URL.revokeObjectURL(blobUrl);
      } else {
        setPreviewUrl(blobUrl);
      }
      setPreviewName(docName);
      setOpenPreview(true);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Failed to preview",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const handlePreviewNew = (doc) => {
    setPreviewUrl(URL.createObjectURL(doc.file));
    setPreviewName(doc.name);
    setOpenPreview(true);
  };

  const handleClosePreview = () => {
    setOpenPreview(false);
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  };

  // ─── Action handlers ──────────────────────────────────────────────
  const handleUpdate = async () => {
    const newErrors = {};
    if (!description.trim()) newErrors.description = "Description is required";
    if (!expDate) newErrors.expDate = "Expected date is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    let docUploader = secureLocalStorage.getItem("CUST_LOGIN_ID");
    try {
      const formData = new FormData();
      formData.append("DESCRIPTION", description);
      formData.append("CLI_EXCOMP_DATE", dayjs(expDate).format("YYYY-MM-DD"));
      if (newDocs.length > 0)
        newDocs.forEach((d) => formData.append("documents", d.file));
      formData.append("DOC_UPLOADER", docUploader);
      let res = await UpdateUserTicket(id, formData);
      if (res?.Status === 1) {
        Swal.fire({
          icon: "success",
          title: "Ticket updated successfully",
          showConfirmButton: false,
          timer: 1800,
        });
        navigate(-1);
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Update failed",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const handleDelete = async (doc) => {
    const confirm = await Swal.fire({
      title: "Delete Document?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6F60C1",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await DeleteTicketDoc(doc.TICKET_DOC_ID);
      if (res?.Status === 1) {
        Swal.fire({
          icon: "success",
          title: "Document deleted successfully",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => handleRemoveExisting(doc));
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Failed to delete document",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const handleAccept = async () => {
    try {
      const res = await UpdateTicketStatus({ ticket_id: id, action: "accept" });
      if (res?.Status === 1)
        Swal.fire({
          icon: "success",
          title: "Ticket accepted successfully",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => navigate(-1));
    } catch {
      Swal.fire({
        icon: "error",
        title: "Failed to accept ticket",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const handleReject = async () => {
    const { value: remarks, isConfirmed } = await Swal.fire({
      title: "Reason for Rejection",
      input: "textarea",
      inputLabel: "Remarks",
      inputPlaceholder: "Enter your reason for rejecting this ticket...",
      inputAttributes: { "aria-label": "Remarks" },
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#d33",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value?.trim()) return "Remarks are required to reject a ticket.";
      },
    });
    if (!isConfirmed) return;
    try {
      const res = await UpdateTicketStatus({
        ticket_id: id,
        action: "reject",
        remarks: remarks.trim(),
      });
      if (res?.Status === 1)
        Swal.fire({
          icon: "success",
          title: "Ticket Rejected",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => navigate(-1));
    } catch {
      Swal.fire({
        icon: "error",
        title: "Failed to reject ticket",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const allDocs = [
    ...existingDocs.map((d) => ({ ...d, isNew: false })),
    ...newDocs.map((d) => ({ ...d, isNew: true })),
  ];

  const {
    label: statusLabel,
    bg: statusBg,
    color: statusColor,
  } = getStatusStyle(ticket?.STATUS_ID);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 2 }}>
        {/* ── Header row: back+title LEFT, chat btn RIGHT ── */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Typography
              color="#6F60C1"
              sx={{ cursor: "pointer", fontSize: "28px", lineHeight: 1 }}
              onClick={() => navigate(-1)}
            >
              ←
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              Update Ticket
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<ChatIcon />}
            onClick={() => setChatOpen(true)}
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
            Chat with Engineer
          </Button>
        </Box>

        <Grid container spacing={2}>
          {/* ── LEFT: Read-only info panel ── */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, borderRadius: 3, height: 542 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                  px: 1,
                  py: 0.8,
                  bgcolor: "#f0f4ff",
                  borderRadius: 2,
                  border: "1px solid #d0d8f0",
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Ticket ID:
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  #{ticket?.TICKET_ID}
                </Typography>
              </Box>

              <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                <Box sx={{ display: "flex", px: 1.5, py: 1 }}>
                  <Box
                    sx={{
                      width: "50%",
                      color: "text.secondary",
                      fontWeight: 600,
                    }}
                  >
                    Title
                  </Box>
                  <Box sx={{ width: "70%" }}>
                    <Typography variant="body1">
                      {ticket?.TITLE || "—"}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell
                        sx={{ color: "text.secondary", fontWeight: 600 }}
                      >
                        Status
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            display: "inline-block",
                            px: 1.5,
                            py: 0.3,
                            borderRadius: 2,
                            fontWeight: 600,
                            fontSize: 12,
                            bgcolor: statusBg,
                            color: statusColor,
                          }}
                        >
                          {statusLabel}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{ color: "text.secondary", fontWeight: 600 }}
                      >
                        Department
                      </TableCell>
                      <TableCell>{ticket?.CUST_DEPT_NAME || "—"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{ color: "text.secondary", fontWeight: 600 }}
                      >
                        Created On
                      </TableCell>
                      <TableCell>
                        {ticket?.CREATED_AT
                          ? dayjs(ticket.CREATED_AT).format("DD-MMM-YYYY")
                          : "—"}
                        {ticket?.CREATED_TIME
                          ? ` · ${ticket.CREATED_TIME}`
                          : ""}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{ color: "text.secondary", fontWeight: 600 }}
                      >
                        Assigned Date
                      </TableCell>
                      <TableCell>
                        {ticket?.ASSIGNED_DATE
                          ? dayjs(ticket.ASSIGNED_DATE).format("DD-MMM-YYYY")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* ── RIGHT: Editable fields ── */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              sx={{ p: 2, borderRadius: 3, height: 227, overflow: "auto" }}
            >
              <TextField
                fullWidth
                multiline
                size="small"
                rows={7}
                label="Ticket Description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (e.target.value.trim())
                    setErrors((p) => ({ ...p, description: "" }));
                }}
                error={!!errors.description}
                helperText={errors.description}
              />
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 3, mt: 1, height: "300px" }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <DatePicker
                    label="Exp Completion Date"
                    format="DD-MMM-YYYY"
                    value={expDate}
                    onChange={(val) => {
                      setExpDate(val);
                      if (val) setErrors((p) => ({ ...p, expDate: "" }));
                    }}
                    sx={{ mb: 1 }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: "small",
                        error: !!errors.expDate,
                        helperText: errors.expDate,
                      },
                    }}
                  />
                  <Typography fontWeight={600} mb={2} textAlign="center">
                    Attach Documents
                  </Typography>
                  <input
                    hidden
                    type="file"
                    multiple
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.xls,.xlsx"
                    onChange={handleFileChange}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    sx={{ mb: 2 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                  </Button>
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                  <TableContainer sx={{ maxHeight: 275 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell width="10%">No</TableCell>
                          <TableCell>Attachment Name</TableCell>
                          <TableCell width="25%" align="center">
                            Action
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allDocs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              No attachments added
                            </TableCell>
                          </TableRow>
                        ) : (
                          allDocs.map((doc, idx) => (
                            <TableRow
                              key={doc.isNew ? doc.tempId : doc.TICKET_DOC_ID}
                              hover
                            >
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell
                                sx={{
                                  maxWidth: 160,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={0.5}
                                >
                                  <InsertDriveFileIcon
                                    fontSize="small"
                                    color={doc.isNew ? "success" : "action"}
                                  />
                                  <Typography variant="body2" noWrap>
                                    {doc.isNew ? doc.name : doc.DOC_NAME}
                                  </Typography>
                                  {doc.isNew && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        bgcolor: "#e8f5e9",
                                        color: "#2e7d32",
                                        px: 0.6,
                                        py: 0.1,
                                        borderRadius: 1,
                                        fontWeight: 700,
                                        fontSize: 10,
                                        flexShrink: 0,
                                      }}
                                    >
                                      NEW
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box display="flex" justifyContent="center">
                                  <Tooltip title="Preview">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() =>
                                        doc.isNew
                                          ? handlePreviewNew(doc)
                                          : handlePreviewExisting(
                                              doc.TICKET_DOC_ID,
                                              doc.DOC_NAME,
                                            )
                                      }
                                    >
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  {ticket?.STATUS_ID === 1 && (
                                    <Tooltip title="Delete">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                          doc.isNew
                                            ? handleRemoveNew(doc.tempId)
                                            : handleDelete(doc)
                                        }
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* ── Action Buttons ── */}
          <Grid size={{ xs: 12 }}>
            {ticket?.STATUS_ID === 1 && (
              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleAccept}
                >
                  Accept
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleReject}
                >
                  Reject
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpdate}
                >
                  Update Ticket
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* ── Preview Dialog ── */}
      <Dialog
        open={openPreview}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <InsertDriveFileIcon color="primary" />
              <Typography fontWeight={700}>{previewName}</Typography>
            </Box>
            <IconButton onClick={handleClosePreview} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: "75vh" }}>
          {previewUrl && (
            <iframe
              src={previewUrl}
              width="100%"
              height="100%"
              style={{ border: "none" }}
              title={previewName}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Chat Drawer ── */}
      <Drawer anchor="right" open={chatOpen} onClose={() => setChatOpen(false)}>
        <Box
          sx={{
            width: 380,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Drawer header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              background: "linear-gradient(135deg, #6F60C1, #8f7df0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <ChatIcon sx={{ color: "#fff" }} />
              <Box>
                <Typography fontWeight={700} color="#fff" fontSize="0.95rem">
                  Chat with Engineer
                </Typography>
                <Typography fontSize="0.72rem" color="rgba(255,255,255,0.8)">
                  Ticket #{ticket?.TICKET_ID} · {ticket?.TITLE}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setChatOpen(false)}
              size="small"
              sx={{ color: "#fff" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider />

          {/* Messages area */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              bgcolor: "#f5f5f5",
            }}
          >
            {chatMessages.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="100%"
                gap={1}
                color="text.secondary"
              >
                <ChatIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                <Typography variant="body2">
                  Start a conversation with the engineer
                </Typography>
              </Box>
            ) : (
              chatMessages.map((msg, idx) => (
                <Box
                  key={idx}
                  display="flex"
                  flexDirection={msg.sender === "user" ? "row-reverse" : "row"}
                  alignItems="flex-end"
                  gap={1}
                >
                  {msg.sender === "engineer" && (
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        bgcolor: "#6F60C1",
                        fontSize: "0.75rem",
                      }}
                    >
                      E
                    </Avatar>
                  )}
                  <Box sx={{ maxWidth: "72%" }}>
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        borderRadius:
                          msg.sender === "user"
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                        bgcolor: msg.sender === "user" ? "#6F60C1" : "#fff",
                        color: msg.sender === "user" ? "#fff" : "#000",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      <Typography variant="body2">{msg.text}</Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        px: 0.5,
                        display: "block",
                        textAlign: msg.sender === "user" ? "right" : "left",
                      }}
                    >
                      {msg.time}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
            <div ref={chatEndRef} />
          </Box>

          <Divider />

          {/* Input area */}
          <Box sx={{ p: 1.5, display: "flex", gap: 1, bgcolor: "#fff" }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "20px" } }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!message.trim()}
              sx={{
                bgcolor: "#6F60C1",
                color: "#fff",
                borderRadius: "50%",
                width: 40,
                height: 40,
                "&:hover": { bgcolor: "#5a4daa" },
                "&:disabled": { bgcolor: "#e0e0e0" },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </LocalizationProvider>
  );
};

export default UpdateTicket;
