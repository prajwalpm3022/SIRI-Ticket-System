import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Divider,
  CircularProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  GetTicketsForAdmin,
  PreviewTicketDocument,
} from "../../Services/AdminDashBoard.services";
import secureLocalStorage from "react-secure-storage";
import Swal from "sweetalert2";

// Same department list as AdminDashBoard
const ALL_DEPARTMENTS = [
  { id: 1, name: "MIS DEPARTMENT" },
  { id: 2, name: "ACCOUNTS DEPARTMENT" },
  { id: 3, name: "MARKETING DEPARTMENT" },
  { id: 4, name: "MILKBILL DEPARTMENT" },
  { id: 5, name: "STORE DEPARTMENT" },
];

export default function AdminTicketView() {
  const { deptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const deptName =
    location.state?.deptName ||
    ALL_DEPARTMENTS.find((d) => d.id === Number(deptId))?.name ||
    "DEPARTMENT";

  const [tab, setTab] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [searchDate, setSearchDate] = useState(null);

  // Docs dialog
  const [openDocsDialog, setOpenDocsDialog] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [selectedTicketTitle, setSelectedTicketTitle] = useState("");

  // Preview dialog
  const [openPreview, setOpenPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");

  // Info dialog
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [selectedTicketInfo, setSelectedTicketInfo] = useState(null);

  const AdminID = secureLocalStorage.getItem("USER_ID");

  //  Uses same GetTicketsForAdmin API — filtered by deptId
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await GetTicketsForAdmin(
        AdminID,
        null,
        null,
        deptId || null,
        null,
      );
      setTickets(response?.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [deptId]);
  
  const STATUS_MAP = {
    null: { label: "Pending", color: "#9e9e9e" },
    1: { label: "Under Review", color: "#5c6bc0" },
    2: { label: "Section Head Approved", color: "#26a69a" },
    3: { label: "Section Head Rejected", color: "#ef5350" },
    4: { label: "Siri Admin Review", color: "#7e57c2" },
    5: { label: "Siri Admin Approved", color: "#66bb6a" },
    6: { label: "Siri Admin Rejected", color: "#f44336" },
    7: { label: "Assigned", color: "#29b6f6" },
    8: { label: "In Progress", color: "#ffa726" },
    9: { label: "Testing", color: "#ab47bc" },
    10: { label: "Verified", color: "#26c6da" },
    11: { label: "Reassigned", color: "#ff7043" },
    12: { label: "Completed", color: "#4caf50" },
    13: { label: "Attachment Required", color: "#ec407a" },
  };

  const getStatusInfo = (statusId) => {
    const key = statusId === null || statusId === undefined ? "null" : statusId;
    return STATUS_MAP[key] || { label: "Unknown", color: "#bdbdbd" };
  };
  // ─── Row mapping ───────────────────────────────────────────
  const mapRow = (t) => ({
    id: t.TICKET_ID,
    title: t.TITLE,
    status: t.STATUS_ID ?? null,
    statusName: t.STATUS_NAME ?? "Pending",
    statusColor: getStatusInfo(t.STATUS_ID).color, // ✅ add this
    createdAt: t.CREATED_AT || null,
    expectedDate: t.CLI_EXCOMP_DATE || null,
    completedDate: t.ASSIGNED_DATE || null,
    dept: t.CUST_DEPT_NAME?.replace(/\s+/g, " ").trim(),
    docs: t.DOCS || [],
    description: t.DESCRIPTION || "-",
    remarks: t.REMARKS || "-",
    assignedDate: t.ASSIGNED_DATE || null,
    _raw: t,
  });

  const getRows = () => {
    let filtered = tickets.map(mapRow);

    if (tab === 0) {
      //  New — null/pending + 1,2,3,4
      filtered = filtered.filter(
        (t) =>
          t.status === null ||
          t.status === undefined ||
          [1, 2, 3, 4].includes(t.status),
      );
    } else if (tab === 1) {
      //  Open — 5,7,8,9,10,11,13
      filtered = filtered.filter((t) =>
        [5, 7, 8, 9, 10, 11, 13].includes(t.status),
      );
      if (searchDate) {
        filtered = filtered.filter(
          (t) =>
            dayjs(t.expectedDate).format("YYYY-MM-DD") ===
            dayjs(searchDate).format("YYYY-MM-DD"),
        );
      }
    } else if (tab === 2) {
      // Completed — 6,12
      filtered = filtered.filter((t) => [6, 12].includes(t.status));
      if (searchDate) {
        filtered = filtered.filter(
          (t) =>
            dayjs(t.completedDate).format("YYYY-MM-DD") ===
            dayjs(searchDate).format("YYYY-MM-DD"),
        );
      }
    }

    return filtered;
  };

  // ─── Tab counts ────────────────────────────────────────────
  const allRows = tickets.map(mapRow);

  const newCount = allRows.filter(
    (t) =>
      t.status === null ||
      t.status === undefined ||
      [1, 2, 3, 4].includes(t.status),
  ).length;
  const openCount = allRows.filter((t) =>
    [5, 7, 8, 9, 10, 11, 13].includes(t.status),
  ).length;
  const completedCount = allRows.filter((t) =>
    [6, 12].includes(t.status),
  ).length;

  // ─── Handlers ──────────────────────────────────────────────
  const handleOpenDocs = (e, row) => {
    e.stopPropagation();
    setSelectedDocs(row.docs || []);
    setSelectedTicketTitle(row.title);
    setOpenDocsDialog(true);
  };

  const handleOpenInfo = (e, row) => {
    e.stopPropagation();
    setSelectedTicketInfo(row);
    setOpenInfoDialog(true);
  };

  const handlePreview = async (docId, docName) => {
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
      setOpenDocsDialog(false);
      setOpenPreview(true);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to preview document",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const handleClosePreview = () => {
    setOpenPreview(false);
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  };

  const handleBackToDocs = () => {
    handleClosePreview();
    setOpenDocsDialog(true);
  };

  // ─── Columns ───────────────────────────────────────────────
  const docsColumn = {
    field: "docs",
    headerName: "Documents",
    width: 120,
    align: "center",
    headerAlign: "center",
    renderCell: (params) => {
      const count = params.value?.length || 0;
      return (
        <Tooltip title={count > 0 ? `${count} document(s)` : "No documents"}>
          <span>
            <IconButton
              size="small"
              color={count > 0 ? "primary" : "default"}
              onClick={(e) => handleOpenDocs(e, params.row)}
              disabled={count === 0}
            >
              <AttachFileIcon fontSize="small" />
              {count > 0 && (
                <Typography variant="caption" sx={{ ml: 0.3, fontWeight: 700 }}>
                  {count}
                </Typography>
              )}
            </IconButton>
          </span>
        </Tooltip>
      );
    },
  };

  const infoActionColumn = {
    field: "actions",
    headerName: "Info",
    width: 100,
    headerAlign: "center",
    align: "center",
    sortable: false,
    renderCell: (params) => (
      <Tooltip title="View Ticket Info">
        <IconButton
          size="small"
          onClick={(e) => handleOpenInfo(e, params.row)}
          sx={{ color: "#6F60C1" }}
        >
          <InfoOutlinedIcon />
        </IconButton>
      </Tooltip>
    ),
  };

  //  show info on ALL tabs, proceed only on New tab (tab === 0)
  const statusColumn = {
    field: "statusName",
    headerName: "Status",
    width: 180,
    align: "center",
    headerAlign: "center",
    renderCell: (params) => (
      <Chip
        label={params.row.statusName}
        size="small"
        sx={{
          backgroundColor: params.row.statusColor || "#9e9e9e",
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.72rem",
          borderRadius: "6px",
        }}
      />
    ),
  };

  const baseColumns = [
    {
      field: "id",
      headerName: "Ticket ID",
      width: 100,
      align: "center",
      headerAlign: "center",
    },
    { field: "title", headerName: "Title", flex: 1 },
    statusColumn,
    {
      field: "createdAt",
      headerName: "Created At",
      width: 140,
      renderCell: (params) =>
        params.value ? dayjs(params.value).format("DD-MMM-YYYY") : "-",
    },
    {
      field: "expectedDate",
      headerName: "Expected Date",
      width: 140,
      renderCell: (params) =>
        params.value ? dayjs(params.value).format("DD-MMM-YYYY") : "-",
    },
    docsColumn,
    infoActionColumn,
  ];

  const completedColumns = [
    {
      field: "id",
      headerName: "Ticket ID",
      width: 100,
      align: "center",
      headerAlign: "center",
    },
    { field: "title", headerName: "Title", flex: 1 },
    statusColumn,
    {
      field: "createdAt",
      headerName: "Created At",
      width: 140,
      renderCell: (params) =>
        params.value ? dayjs(params.value).format("DD-MMM-YYYY") : "-",
    },
    {
      field: "expectedDate",
      headerName: "Expected Date",
      width: 140,
      renderCell: (params) =>
        params.value ? dayjs(params.value).format("DD-MMM-YYYY") : "-",
    },
    {
      field: "completedDate",
      headerName: "Completed Date",
      width: 140,
      renderCell: (params) =>
        params.value ? dayjs(params.value).format("DD-MMM-YYYY") : "-",
    },
    docsColumn,
    infoActionColumn,
  ];

  // ─── Render ────────────────────────────────────────────────
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }} bgcolor="#f6f7fb">
        {/* Header */}
        <Typography variant="h5" fontWeight={600} mb={2}>
          {deptName} TICKETS
        </Typography>

        <Card sx={{ borderRadius: 3, p: 2, boxShadow: 4 }}>
          {/* Tabs with counts */}
          <Tabs
            value={tab}
            onChange={(e, v) => {
              setTab(v);
              setSelectedDate(null);
              setSearchDate(null);
            }}
            sx={{ borderBottom: "1px solid #e0e0e0" }}
          >
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  New
                  <Chip
                    label={newCount}
                    size="small"
                    color="error"
                    sx={{ height: 20, fontSize: "0.7rem" }}
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  Open
                  <Chip
                    label={openCount}
                    size="small"
                    color="warning"
                    sx={{ height: 20, fontSize: "0.7rem" }}
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  Completed
                  <Chip
                    label={completedCount}
                    size="small"
                    color="success"
                    sx={{ height: 20, fontSize: "0.7rem" }}
                  />
                </Box>
              }
            />
          </Tabs>

          {/* Date filter for Open / Completed tabs */}
          {tab !== 0 && (
            <Box
              display="flex"
              justifyContent="flex-end"
              alignItems="center"
              gap={2}
              mt={2}
            >
              <DatePicker
                label={tab === 1 ? "Expected Date" : "Completed Date"}
                format="DD-MMM-YYYY"
                value={selectedDate}
                onChange={(v) => setSelectedDate(v)}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: { minWidth: 200, backgroundColor: "white" },
                  },
                }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={() => setSearchDate(selectedDate)}
              >
                Search
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  setSelectedDate(null);
                  setSearchDate(null);
                }}
              >
                Clear
              </Button>
            </Box>
          )}

          {/* DataGrid */}
          <Paper sx={{ height: 450, mt: 2 }}>
            {loading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
              >
                <CircularProgress sx={{ color: "#6F60C1" }} />
              </Box>
            ) : (
              <DataGrid
                rows={getRows()}
                columns={tab === 2 ? completedColumns : baseColumns}
                hideFooter
                disableRowSelectionOnClick
              />
            )}
          </Paper>
        </Card>

        {/* Back link */}
        <Box mt={3}>
          <Typography
            color="#6F60C1"
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/Drawer/admindashboard")}
          >
            ← Back to Dashboard
          </Typography>
        </Box>
      </Box>

      {/* ── Docs Dialog ── */}
      <Dialog
        open={openDocsDialog}
        onClose={() => setOpenDocsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <AttachFileIcon color="primary" />
              <Typography fontWeight={700}>
                Documents — {selectedTicketTitle}
              </Typography>
            </Box>
            <IconButton onClick={() => setOpenDocsDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDocs.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3}>
              No documents attached
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell>Uploaded Date</TableCell>
                  <TableCell align="center">Preview</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedDocs.map((doc, index) => (
                  <TableRow key={doc.TICKET_DOC_ID} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <InsertDriveFileIcon fontSize="small" color="action" />
                        <Typography variant="body2">{doc.DOC_NAME}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {doc.UPLOADED_DATE
                        ? dayjs(doc.UPLOADED_DATE).format("DD-MMM-YYYY")
                        : "-"}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Preview">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() =>
                            handlePreview(doc.TICKET_DOC_ID, doc.DOC_NAME)
                          }
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

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
        <DialogActions>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToDocs}
            variant="contained"
          >
            Back to Documents
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Info Dialog (Open tab only) ── */}
      <Dialog
        open={openInfoDialog}
        onClose={() => setOpenInfoDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography fontWeight={700} fontSize={18}>
              Ticket Details
            </Typography>
            <IconButton onClick={() => setOpenInfoDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTicketInfo && (
            <Box display="flex" flexDirection="column" gap={2} py={1}>
              {[
                { label: "Ticket ID", value: `#${selectedTicketInfo.id}` },
                { label: "Title", value: selectedTicketInfo.title },
                {
                  label: "Description",
                  value: (
                    <Tooltip title={selectedTicketInfo.description}>
                      <Typography
                        variant="body2"
                        maxWidth="60%"
                        textAlign="right"
                        sx={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          cursor: "pointer",
                        }}
                      >
                        {selectedTicketInfo.description}
                      </Typography>
                    </Tooltip>
                  ),
                },
                { label: "Department", value: selectedTicketInfo.dept || "—" },
                {
                  label: "Status",
                  value: (
                    <Chip
                      label={selectedTicketInfo.statusName}
                      size="small"
                      sx={{
                        backgroundColor: selectedTicketInfo.statusColor,
                        color: "#fff",
                        fontWeight: 600,
                      }}
                    />
                  ),
                },
                {
                  label: "Created At",
                  value: selectedTicketInfo.createdAt
                    ? dayjs(selectedTicketInfo.createdAt).format("DD-MMM-YYYY")
                    : "—",
                },
                {
                  label: "Expected Date",
                  value: selectedTicketInfo.expectedDate
                    ? dayjs(selectedTicketInfo.expectedDate).format(
                        "DD-MMM-YYYY",
                      )
                    : "—",
                },
                {
                  label: "Assigned Date",
                  value: selectedTicketInfo.assignedDate
                    ? dayjs(selectedTicketInfo.assignedDate).format(
                        "DD-MMM-YYYY",
                      )
                    : "—",
                },
                { label: "Remarks", value: selectedTicketInfo.remarks || "—" },
                {
                  label: "Documents",
                  value: `${selectedTicketInfo.docs?.length || 0} file(s) attached`,
                },
              ].map(({ label, value }) => (
                <React.Fragment key={label}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontWeight={600}
                      minWidth={130}
                    >
                      {label}
                    </Typography>
                    {typeof value === "string" ? (
                      <Typography
                        variant="body2"
                        maxWidth="60%"
                        textAlign="right"
                      >
                        {value}
                      </Typography>
                    ) : (
                      value
                    )}
                  </Box>
                  <Divider />
                </React.Fragment>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </LocalizationProvider>
  );
}
