import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Skeleton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useQuery } from "@tanstack/react-query";
import {
  CreateTickets,
  CategoryGridData,
  DeleteTicketDocByUser,
} from "../../Services/CreateTicket.Services";
import {
  UpdateUserTicket,
  PreviewTicketDocument,
} from "../../Services/AdminDashBoard.services";
import dayjs from "dayjs";
import {
  showPostSuccess,
  showPostError,
  showAlert,
  showUpdateSuccess,
  showUpdateError,
} from "../../Components/swal_alert";
import Swal from "sweetalert2";
import TicketChat from "../TicketChat/TicketChat";
import secureLocalStorage from "react-secure-storage";
import ChatIcon from "@mui/icons-material/Chat";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CircularBubbleLoading from "../../Components/loading";
const columns = [
  { field: "CATEGORY_ID", headerName: "ID", width: 50 },
  {
    field: "CATEGORY_NAME",
    headerName: "Category Name",
    width: 530,
    editable: true,
  },
];

const CreateTicket = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isEditMode = location.state?.isEdit || false;
  const ticketId = location.state?.ticketId || null;
  const statusId = location.state?.statusId ?? null;
  const isViewOnly = isEditMode && Number(statusId) !== 1;

  const [attachments, setAttachments] = useState([]);
  const [newDocs, setNewDocs] = useState([]);
  const [formData, setFormData] = useState({
    Title: "",
    TicketDesc: "",
    Date: null,
    File: [],
  });
  const [errors, setErrors] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUserType = secureLocalStorage.getItem("LOGIN_TYPE");

  const isImageFile = (name) => /\.(png|jpe?g|gif|webp)$/i.test(name);
  const isPreviewableFile = (name) =>
    /\.(png|jpe?g|gif|webp|pdf|doc|docx|xls|xlsx|txt|csv)$/i.test(name);

  // ─── React Query ───────────────────────────────────────────
  const { data: categorydata = [], isFetching: categoryLoading } = useQuery({
    queryKey: ["categoryGrid"],
    queryFn: async () => {
      const res = await CategoryGridData();
      return res?.items || [];
    },
    enabled: !isEditMode, // only fetch categories in create mode
    staleTime: 5 * 60 * 1000,
  });

  // ─── Edit mode init ────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && location.state?.rowData) {
      const row = location.state.rowData;
      setFormData((prev) => ({
        ...prev,
        Title: row.Title || "",
        TicketDesc: row.TicketDesc || "",
        statusName: row.statusName,
        Date: row.Date ? dayjs(row.Date) : null,
      }));
      if (row.docs?.length > 0) {
        setAttachments(
          row.docs.map((doc) => ({
            name: doc.DOC_NAME,
            id: doc.TICKET_DOC_ID,
            isExisting: true,
          })),
        );
      }
      navigate(location.pathname, {
        replace: true,
        state: {
          isEdit: true,
          ticketId: location.state.ticketId,
          statusId: location.state.statusId,
          rowData: location.state.rowData,
        },
      });
    } else {
      setFormData({ Title: "", TicketDesc: "", Date: null, File: [] });
      setAttachments([]);
      setNewDocs([]);
      setErrors({});
    }
  }, [isEditMode]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleRowClick = (row) => {
    setFormData((prev) => ({ ...prev, Title: row.CATEGORY_NAME }));
    setErrors((prev) => ({ ...prev, Title: "" }));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
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
    const validFiles = [];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        showAlert(
          "warning",
          "Invalid File Type",
          "Please upload a valid document or Image file.",
        );
        continue;
      }
      if (file.size > maxSize) {
        showAlert(
          "warning",
          "File Too Large",
          "File size must be less than 2 MB.",
        );
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length > 0) {
      const updatedFiles = [...attachments, ...validFiles];
      setAttachments(updatedFiles);
      setFormData((prev) => ({ ...prev, File: updatedFiles }));
      setNewDocs((prev) => [...prev, ...validFiles.map((file) => ({ file }))]);
    }
    event.target.value = null;
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = attachments.filter((_, i) => i !== index);
    setAttachments(updatedFiles);
    setFormData((prev) => ({ ...prev, File: updatedFiles }));
    setNewDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleValidation = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({
      ...prev,
      [name]: value.trim() ? "" : `${name} is required`,
    }));
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!formData.TicketDesc.trim())
      newErrors.TicketDesc = "Description is required";
    if (!formData.Date) newErrors.Date = "Expected date is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const custID = secureLocalStorage.getItem("USER_ID");
    const cust_dept_id = secureLocalStorage.getItem("DEPT_ID");
    const login_id = secureLocalStorage.getItem("CUST_LOGIN_ID");
    const dept_name_short = secureLocalStorage.getItem("DEPT_SHORT_NAME");
    const cust_short_name = secureLocalStorage.getItem("CUST_SHORT_NAME");
    setIsSubmitting(true);
    try {
      const formPayload = new FormData();
      formPayload.append("TITLE", formData.Title || "Undefined");
      formPayload.append("DESCRIPTION", formData.TicketDesc);
      formPayload.append("CREATED_BY", Number(custID));
      formPayload.append(
        "CLI_EXCOMP_DATE",
        dayjs(formData.Date).format("YYYY-MM-DD"),
      );
      formPayload.append("STATUS_ID", 1);
      formPayload.append("CUSTOMER_DEPT_ID", Number(cust_dept_id));
      formPayload.append("CUST_LOGIN_ID", Number(login_id));
      formPayload.append("DOC_UPLOADER", Number(login_id));
      formPayload.append(
        "TICKET_PREFIX",
        `${cust_short_name}/${dept_name_short}`,
      );
      formPayload.append(
        "TKT_DOC_FROM",
        `${cust_short_name}_${dept_name_short}_${login_id}`,
      );
      attachments.forEach((file) => formPayload.append("documents", file));

      const response = await CreateTickets(formPayload);

      if (response?.Status === 1) {
        showPostSuccess("Ticket created successfully");
        handleClear();
        setTimeout(() => navigate("/Drawer/open-ticket"), 1500);
      } else {
        showPostError("Ticket creation failed");
      }
    } catch {
      showPostError("Ticket creation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = async (file) => {
    if (file.isExisting) {
      try {
        const res = await PreviewTicketDocument(file.id);
        const blob = new Blob([res.data], {
          type: res.headers["content-type"],
        });
        const blobUrl = URL.createObjectURL(blob);
        const ext = file.name.split(".").pop().toLowerCase();
        if (["doc", "docx", "xls", "xlsx"].includes(ext)) {
          const directUrl = `${import.meta.env.VITE_API_URL}/AdminDashBoard/previewTicketDocument/${file.id}`;
          setPreviewFile({
            url: `https://docs.google.com/viewer?url=${encodeURIComponent(directUrl)}&embedded=true`,
            name: file.name,
          });
        } else {
          setPreviewFile({ url: blobUrl, name: file.name });
        }
      } catch {
        Swal.fire({
          icon: "error",
          title: "Failed to preview",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } else {
      setPreviewFile({ url: URL.createObjectURL(file), name: file.name });
    }
  };

  const handleUpdate = async () => {
    const newErrors = {};
    if (!formData.TicketDesc.trim())
      newErrors.TicketDesc = "Description is required";
    if (!formData.Date) newErrors.Date = "Expected date is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const docUploader = secureLocalStorage.getItem("CUST_LOGIN_ID");
    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("DESCRIPTION", formData.TicketDesc);
      payload.append(
        "CLI_EXCOMP_DATE",
        dayjs(formData.Date).format("YYYY-MM-DD"),
      );
      payload.append("DOC_UPLOADER", docUploader);
      if (newDocs.length > 0)
        newDocs.forEach((d) => payload.append("documents", d.file));

      const res = await UpdateUserTicket(ticketId, payload);
      if (res?.Status === 1) {
        showUpdateSuccess("Ticket updated successfully");
        navigate(-1);
      }
    } catch {
      showUpdateError("Ticket update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (ticket_doc_id) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This document will be deleted.",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      confirmButtonColor: "#d33",
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await DeleteTicketDocByUser(ticket_doc_id);
      if (res?.Status === 1) {
        setAttachments((prev) => prev.filter((f) => f.id !== ticket_doc_id));
        Swal.fire({
          icon: "success",
          title: "Document deleted successfully",
          showConfirmButton: false,
          timer: 1500,
        });
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

  const handleClearTitle = () => {
    setFormData((prev) => ({ ...prev, Title: "" }));
    setErrors((prev) => ({ ...prev, Title: "" }));
  };

  const handleClear = () => {
    setErrors({});
    setAttachments([]);
    setNewDocs([]);
    setFormData({ Title: "", TicketDesc: "", Date: null, File: [] });
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <>
      <CircularBubbleLoading
        isLoading={isSubmitting}
        messages={[
          "Processing your Ticket...",
          "Uploading files...",
          "Saving changes...",
          "Almost there...",
          "Hang tight...",
        ]}
      />
      <Box sx={{ p: 2 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isEditMode && (
              <IconButton onClick={() => navigate(-1)} size="small">
                <ArrowBackIcon />
              </IconButton>
            )}
            <Typography variant="h4" fontWeight={600}>
              {isEditMode ? "UPDATE TICKET" : "CREATE TICKET"}
            </Typography>
          </Box>
          {isEditMode && (
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
          )}
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {isEditMode ? (
              <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                {[
                  { label: "Ticket ID", value: `#${ticketId}` },
                  { label: "Title", value: formData.Title || "—" },
                  {
                    label: "Status",
                    value: location.state?.rowData?.statusName || "—",
                  },
                  {
                    label: "Department",
                    value: location.state?.rowData?.dept || "—",
                  },
                  {
                    label: "Created On",
                    value: location.state?.rowData?.createdAt || "—",
                  },
                  {
                    label: "Assigned Date",
                    value: location.state?.rowData?.assignedDate || "—",
                  },
                ].map(({ label, value }) => (
                  <Box
                    key={label}
                    display="flex"
                    alignItems="center"
                    sx={{
                      py: 1.5,
                      px: 1,
                      borderBottom: "1px solid #f0f0f0",
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <Typography
                      fontWeight={600}
                      color="text.secondary"
                      minWidth={150}
                    >
                      {label}
                    </Typography>
                    <Typography>{value}</Typography>
                  </Box>
                ))}
              </Paper>
            ) : (
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Box sx={{ height: 542, width: "100%" }}>
                  {categoryLoading ? (
                    <Box sx={{ px: 1, pt: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 2,
                          pb: 1,
                          mb: 1,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Skeleton variant="text" width={40} height={20} />
                        <Skeleton variant="text" width={200} height={20} />
                      </Box>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <Box
                          key={i}
                          sx={{
                            display: "flex",
                            gap: 2,
                            alignItems: "center",
                            py: 0.6,
                            borderBottom: "1px solid",
                            borderColor: "grey.100",
                          }}
                        >
                          <Skeleton variant="text" width={30} height={16} />
                          <Skeleton
                            variant="text"
                            width={`${55 + (i % 4) * 10}%`}
                            height={16}
                            sx={{ borderRadius: 1 }}
                          />
                        </Box>
                      ))}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 1,
                          mt: 1.5,
                          pt: 1,
                          borderTop: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Skeleton variant="text" width={120} height={20} />
                        <Skeleton variant="rounded" width={60} height={28} />
                      </Box>
                    </Box>
                  ) : (
                    <DataGrid
                      rows={categorydata}
                      columns={columns}
                      getRowId={(row) => row.CATEGORY_ID}
                      onRowClick={(params) => handleRowClick(params.row)}
                      rowHeight={35}
                      sx={{ width: "100%" }}
                      initialState={{
                        pagination: { paginationModel: { pageSize: 12 } },
                      }}
                      pageSizeOptions={[10]}
                      disableRowSelectionOnClick
                    />
                  )}
                </Box>
              </Paper>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              sx={{ p: 2, borderRadius: 3, height: 267, overflow: "auto" }}
            >
              <Grid container spacing={1}>
                <Grid size={{ xs: 12 }}>
                  {formData.Title && !isEditMode && (
                    <Paper>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ mt: 1, p: 1, fontWeight: 600 }}
                        >
                          Title:{" "}
                          <span
                            style={{
                              fontSize: "16px",
                              color: "black",
                              fontWeight: 100,
                            }}
                          >
                            {formData.Title}
                          </span>
                        </Typography>
                        {!isViewOnly && (
                          <IconButton
                            onClick={handleClearTitle}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </Paper>
                  )}
                </Grid>
                <Grid size={{ xs: 12 }} mt={1}>
                  <TextField
                    fullWidth
                    multiline
                    size="small"
                    rows={7}
                    label="Ticket Description"
                    name="TicketDesc"
                    value={formData.TicketDesc}
                    onChange={(e) => {
                      if (e.target.value.length <= 300) handleValidation(e);
                    }}
                    error={!!errors.TicketDesc}
                    helperText={errors.TicketDesc}
                    slotProps={{ input: { readOnly: isViewOnly } }}
                    disabled={isViewOnly}
                  />
                  <Typography
                    variant="caption"
                    display="block"
                    textAlign="right"
                    sx={{
                      mt: 0.5,
                      color:
                        formData.TicketDesc.length >= 300
                          ? "error.main"
                          : formData.TicketDesc.length >= 250
                            ? "warning.main"
                            : "text.secondary",
                    }}
                  >
                    {formData.TicketDesc.length} / 300
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 3, mt: 1, height: "300px" }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Exp Completion Date"
                      format="DD-MMM-YYYY"
                      value={formData.Date}
                      disabled={isViewOnly}
                      sx={{ mb: 1 }}
                      onChange={(newValue) =>
                        setFormData((prev) => ({ ...prev, Date: newValue }))
                      }
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.Date,
                          helperText: errors.Date,
                          size: "small",
                        },
                      }}
                    />
                  </LocalizationProvider>
                  <Typography fontWeight={600} mb={2} textAlign="center">
                    Attach Documents
                  </Typography>
                  {!isViewOnly && (
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      component="label"
                      sx={{ mb: 2 }}
                    >
                      Browse files
                      <input
                        hidden
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                      />
                    </Button>
                  )}
                  {errors.File && (
                    <Typography color="error" variant="body2" mb={2}>
                      {errors.File}
                    </Typography>
                  )}
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                  <TableContainer sx={{ maxHeight: 275 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell width="10%">No</TableCell>
                          <TableCell>Attachment Name</TableCell>
                          <TableCell width="25%">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attachments.length > 0 ? (
                          attachments.map((file, index) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell
                                sx={{
                                  maxWidth: 200,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {file.name}
                              </TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center">
                                  {isPreviewableFile(file.name) && (
                                    <IconButton
                                      onClick={() => handlePreview(file)}
                                      color="primary"
                                      size="small"
                                    >
                                      <VisibilityIcon />
                                    </IconButton>
                                  )}
                                  {!isViewOnly && (
                                    <IconButton
                                      onClick={() =>
                                        isEditMode && file.isExisting
                                          ? handleDelete(file.id)
                                          : handleRemoveFile(index)
                                      }
                                      color="error"
                                      size="small"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              No attachments added
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            {!isViewOnly && (
              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button
                  variant="contained"
                  color={isEditMode ? "success" : "primary"}
                  onClick={isEditMode ? handleUpdate : handleSubmit}
                >
                  {isEditMode ? "Update" : "Save"}
                </Button>
                <Button variant="contained" color="error" onClick={handleClear}>
                  Clear
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="body1" fontWeight={600} noWrap>
            {previewFile?.name}
          </Typography>
          <IconButton onClick={() => setPreviewFile(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: "75vh" }}>
          {previewFile &&
            (isImageFile(previewFile.name) ? (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                style={{
                  width: "100%",
                  objectFit: "contain",
                  maxHeight: "100%",
                  borderRadius: 8,
                  padding: 8,
                }}
              />
            ) : (
              <iframe
                src={previewFile.url}
                width="100%"
                height="100%"
                style={{ border: "none" }}
                title={previewFile.name}
              />
            ))}
        </DialogContent>
      </Dialog>

      {isEditMode && (
        <TicketChat
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          ticketId={ticketId}
          ticketTitle={location.state?.rowData?.Title || ""}
          currentUserType={currentUserType}
        />
      )}
    </>
  );
};

export default CreateTicket;
