import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Skeleton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { PreviewTicketDocument } from "../../Services/AdminDashBoard.services";
import EditIcon from "@mui/icons-material/Edit";
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

export default function TicketGrid({
  tickets = [],
  selectedDate,
  loading = false,
}) {
  const [openDocsDialog, setOpenDocsDialog] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [selectedTicketTitle, setSelectedTicketTitle] = useState("");

  const [openPreview, setOpenPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");

  const [openDetails, setOpenDetails] = useState(false);
  const [detailTicket, setDetailTicket] = useState(null);
  const navigate = useNavigate();
  // Build all rows first
  const allRows = tickets.map((t) => {
    const { label, color } = getStatusInfo(t.STATUS_ID);
    return {
      id: t.TICKET_ID,
      title: t.TITLE,
      description: t.DESCRIPTION || "",
      statusId: t.STATUS_ID,
      statusLabel: label,
      statusColor: color,
      date: t.CLI_EXCOMP_DATE
        ? dayjs(t.CLI_EXCOMP_DATE).format("DD-MMM-YYYY")
        : "-",
      dateRaw: t.CLI_EXCOMP_DATE ?? null,
      createdAt: t.CREATED_AT ? dayjs(t.CREATED_AT).format("DD-MMM-YYYY") : "-",
      createdAtRaw: t.CREATED_AT ?? null,
      dept: t.CUST_DEPT_NAME?.trim(),
      docs: t.DOCS || [],
    };
  });

  // Filter by selected date only when a date is provided
  const rows = selectedDate
    ? allRows.filter(
        (row) =>
          row.createdAtRaw &&
          dayjs(row.createdAtRaw).format("YYYY-MM-DD") ===
            dayjs(selectedDate).format("YYYY-MM-DD"),
      )
    : allRows;

  const handleOpenDocs = (e, row) => {
    e.stopPropagation();
    setSelectedDocs(row.docs || []);
    setSelectedTicketTitle(row.title);
    setOpenDocsDialog(true);
  };

  const handleOpenDetails = (e, row) => {
    e.stopPropagation();
    const full = tickets.find((t) => t.TICKET_ID === row.id);
    setDetailTicket(full);
    setOpenDetails(true);
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

  const handleEdit = (e, row) => {
    e.stopPropagation();
    navigate("/Drawer/create-ticket", {
      state: {
        isEdit: true,
        ticketId: row.id,
        statusId: row.statusId,
        rowData: {
          Title: row.title,
          TicketDesc: row.description,
          Date: row.dateRaw,
          statusId: row.statusId,
          statusName: row.statusLabel,
          docs: row.docs,
          dept: row.dept,
          createdAt: row.createdAt,
        },
      },
    });
  };

  const columns = [
    {
      field: "edit",
      headerName: "Action",
      width: 80,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: (params) => (
        <Tooltip title={params.row.statusId !== 1 ? "Cannot Edit" : "Edit"}>
          <span>
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => handleEdit(e, params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ),
    },
    {
      field: "id",
      headerName: "Ticket ID",
      width: 100,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "title",
      headerName: "Title",
      flex: 1,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "details",
      headerName: "Details",
      width: 80,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Details">
          <IconButton
            size="small"
            color="info"
            onClick={(e) => handleOpenDetails(e, params.row)}
          >
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
    {
      field: "dept",
      headerName: "Department",
      width: 200,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "statusLabel",
      headerName: "Status",
      width: 200,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 0.4,
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: 700,
              backgroundColor: params.row.statusColor,
              color: "#fff",
              whiteSpace: "nowrap",
              lineHeight: 1.5,
            }}
          >
            {params.value}
          </Box>
        </Box>
      ),
    },
    {
      field: "createdAt",
      headerName: "Created At",
      width: 130,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "date",
      headerName: "Exp. Completion",
      width: 140,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "docs",
      headerName: "Documents",
      width: 110,
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
                  <Typography
                    variant="caption"
                    sx={{ ml: 0.3, fontWeight: 700 }}
                  >
                    {count}
                  </Typography>
                )}
              </IconButton>
            </span>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <>
      <Box sx={{ height: 500, width: "100%" }}>
        <Box
          sx={{
            borderRadius: 2,
            boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
            backgroundColor: "#f9f9f9",
          }}
        >
          {loading ? (
            <Box sx={{ px: 1.5, pt: 1 }}>
              {/* Header skeleton — mirrors DataGrid column headers */}
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
                {[80, 100, 120, 80, 200, 200, 130, 140, 110].map((w, i) => (
                  <Skeleton
                    key={i}
                    variant="text"
                    width={w}
                    height={22}
                    sx={{ flexShrink: 0 }}
                  />
                ))}
              </Box>

              {/* Row skeletons — 8 rows matching rowHeight={52} */}
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
                  {/* Action icon */}
                  <Skeleton
                    variant="circular"
                    width={28}
                    height={28}
                    sx={{ flexShrink: 0 }}
                  />
                  {/* Ticket ID */}
                  <Skeleton
                    variant="text"
                    width={60}
                    height={18}
                    sx={{ flexShrink: 0 }}
                  />
                  {/* Title — flex fills remaining space */}
                  <Skeleton
                    variant="text"
                    width={`${30 + (i % 5) * 8}%`}
                    height={18}
                    sx={{ flex: 1 }}
                  />
                  {/* Details icon */}
                  <Skeleton
                    variant="circular"
                    width={28}
                    height={28}
                    sx={{ flexShrink: 0 }}
                  />
                  {/* Department */}
                  <Skeleton
                    variant="text"
                    width={140}
                    height={18}
                    sx={{ flexShrink: 0 }}
                  />
                  {/* Status chip */}
                  <Skeleton
                    variant="rounded"
                    width={130}
                    height={26}
                    sx={{ borderRadius: "6px", flexShrink: 0 }}
                  />
                  {/* Created At */}
                  <Skeleton
                    variant="text"
                    width={90}
                    height={18}
                    sx={{ flexShrink: 0 }}
                  />
                  {/* Exp. Completion */}
                  <Skeleton
                    variant="text"
                    width={100}
                    height={18}
                    sx={{ flexShrink: 0 }}
                  />
                  {/* Docs icon */}
                  <Skeleton
                    variant="circular"
                    width={28}
                    height={28}
                    sx={{ flexShrink: 0 }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              rowHeight={52}
              sx={{
                width: "100%",
                "& .MuiDataGrid-cell": {
                  display: "flex",
                  alignItems: "center",
                },
              }}
              hideFooter
              disableRowSelectionOnClick
            />
          )}
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
                          <InsertDriveFileIcon
                            fontSize="small"
                            color="action"
                          />
                          <Typography variant="body2">
                            {doc.DOC_NAME}
                          </Typography>
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
              variant="outlined"
            >
              Back to Documents
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Ticket Details Dialog ── */}
        <Dialog
          open={openDetails}
          onClose={() => setOpenDetails(false)}
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
              <IconButton onClick={() => setOpenDetails(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {detailTicket && (
              <Box display="flex" flexDirection="column" gap={2}>
                {[
                  { label: "Ticket ID", value: `#${detailTicket.TICKET_ID}` },
                  { label: "Title", value: detailTicket.TITLE },
                  {
                    label: "Description",
                    value: detailTicket.DESCRIPTION || "—",
                  },
                  {
                    label: "Department",
                    value: detailTicket.CUST_DEPT_NAME || "—",
                  },
                  {
                    label: "Status",
                    value: (() => {
                      const { label, color } = getStatusInfo(
                        detailTicket.STATUS_ID,
                      );
                      return (
                        <Box
                          sx={{
                            px: 1.5,
                            py: 0.3,
                            borderRadius: "6px",
                            fontSize: 13,
                            fontWeight: 600,
                            backgroundColor: color,
                            color: "#fff",
                            display: "inline-block",
                          }}
                        >
                          {label}
                        </Box>
                      );
                    })(),
                  },
                  {
                    label: "Created At",
                    value: detailTicket.CREATED_AT
                      ? `${dayjs(detailTicket.CREATED_AT).format("DD-MMM-YYYY")}${detailTicket.CREATED_TIME ? ` · ${detailTicket.CREATED_TIME}` : ""}`
                      : "—",
                  },
                  {
                    label: "Expected Date",
                    value: detailTicket.CLI_EXCOMP_DATE
                      ? dayjs(detailTicket.CLI_EXCOMP_DATE).format(
                          "DD-MMM-YYYY",
                        )
                      : "—",
                  },
                  {
                    label: "Assigned Date",
                    value: detailTicket.ASSIGNED_DATE
                      ? dayjs(detailTicket.ASSIGNED_DATE).format("DD-MMM-YYYY")
                      : "—",
                  },
                  { label: "Remarks", value: detailTicket.REMARKS || "—" },
                  {
                    label: "Documents",
                    value:
                      detailTicket.DOCS?.length > 0
                        ? `${detailTicket.DOCS.length} file(s) attached`
                        : "No documents",
                  },
                ].map(({ label, value }) => (
                  <Box
                    key={label}
                    display="flex"
                    gap={1}
                    alignItems="flex-start"
                  >
                    <Typography
                      fontWeight={600}
                      minWidth={150}
                      color="text.secondary"
                    >
                      {label}
                    </Typography>

                    <Typography
                      component="span"
                      sx={{
                        whiteSpace:
                          label === "Description" ? "nowrap" : "pre-wrap",
                        overflow:
                          label === "Description" ? "hidden" : "visible",
                        textOverflow:
                          label === "Description" ? "ellipsis" : "clip",
                        maxWidth: 400,
                      }}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </>
  );
}
