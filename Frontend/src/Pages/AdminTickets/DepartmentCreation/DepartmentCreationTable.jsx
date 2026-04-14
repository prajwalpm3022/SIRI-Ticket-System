import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Skeleton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const SKELETON_ROWS = 7;

const DepartmentCreationTable = ({
  loading,
  filteredRows,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
}) => {
  const pagedRows = filteredRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <TableContainer>
        <Table size="small" sx={{ tableLayout: "fixed" }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#7E6ED7" }}>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12,
                  width: 90,
                }}
              >
                Action
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600, fontSize: 12 }}>
                Department Name
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12,
                  width: 120,
                }}
              >
                Short Name
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {/* Skeleton rows */}
            {loading &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton
                      variant="circular"
                      width={24}
                      height={24}
                      sx={{ display: "inline-block", mr: 0.5 }}
                    />
                    <Skeleton
                      variant="circular"
                      width={24}
                      height={24}
                      sx={{ display: "inline-block" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Skeleton
                      variant="text"
                      width="80%"
                      height={16}
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Skeleton
                      variant="text"
                      width="60%"
                      height={16}
                      sx={{ borderRadius: 1 }}
                    />
                  </TableCell>
                </TableRow>
              ))}

            {/* Real rows */}
            {!loading &&
              pagedRows.map((row, idx) => (
                <TableRow
                  key={row.CUST_DEPT_ID ?? idx}
                  hover
                  sx={{ "&:last-child td": { border: 0 } }}
                >
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => onEdit(row)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDelete(row.CUST_DEPT_ID)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    {row.CUST_DEPT_NAME}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.SHORT_NAME}</TableCell>
                </TableRow>
              ))}

            {/* Empty state */}
            {!loading && filteredRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  align="center"
                  sx={{ py: 4, color: "text.secondary", fontSize: 13 }}
                >
                  No records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredRows.length}
        page={page}
        onPageChange={(_, p) => onPageChange(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          onRowsPerPageChange(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Paper>
  );
};

export default DepartmentCreationTable;
