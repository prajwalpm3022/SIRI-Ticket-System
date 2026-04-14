import {
  Grid,
  TextField,
  Autocomplete,
  Button,
  Box,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Skeleton,
} from "@mui/material";
import { IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

const loginTypeColor = { CU: "primary", SH: "success" };

const COLUMNS = [
  { id: "action", label: "Action" },
  { id: "NAME", label: "Name" },
  { id: "CUST_USER_ID", label: "Username" },
  { id: "CUSTOMER_NAME", label: "Customer Name" },
  { id: "CUST_DEPT_NAME", label: "Dept Name" },
  { id: "EMAIL", label: "Email" },
  { id: "LOGIN_TYPE", label: "Login Type" },
  { id: "MOBILE", label: "Mobile" },
  { id: "ACTIVE", label: "Active" },
];

const SKELETON_ROWS = 7; // number of placeholder rows while loading

const UserCreationTable = ({
  departments,
  rows,
  filteredRows,
  loading,
  search,
  page,
  rowsPerPage,
  onSearchChange,
  onSearch,
  onSearchReset,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
}) => {
  const pagedRows = filteredRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <>
      {/* Search Panel */}
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <Autocomplete
              options={departments}
              getOptionLabel={(option) => option.CUST_DEPT_NAME ?? ""}
              isOptionEqualToValue={(option, value) =>
                option.CUST_DEPT_ID === value?.CUST_DEPT_ID
              }
              value={search.department}
              onChange={(_, val) => onSearchChange("department", val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Department"
                  size="small"
                  placeholder="Filter by department…"
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Name"
              placeholder="Filter by name…"
              value={search.name}
              onChange={(e) => onSearchChange("name", e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }} sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              color="primary"
              fullWidth
              onClick={onSearch}
            >
              Search
            </Button>
            <Button
              variant="contained"
              size="small"
              color="error"
              fullWidth
              onClick={onSearchReset}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <TableContainer>
          <Table size="small" sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#7E6ED7" }}>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    color: "white",
                    width: 50,
                    textAlign: "left",
                  }}
                >
                  Action
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    color: "white",
                    width: 90,
                  }}
                >
                  Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    color: "white",
                    width: 120,
                  }}
                >
                  Username
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    color: "white",
                    width: 150,
                  }}
                >
                  Customer Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    color: "white",
                    width: 120,
                  }}
                >
                  Dept Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    color: "white",
                    width: 150,
                    textAlign: "center",
                  }}
                >
                  Email
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    color: "white",
                    width: 80,
                    textAlign: "left",
                  }}
                >
                  Login Type
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    color: "white",
                    width: 100,
                    textAlign: "center",
                  }}
                >
                  Mobile
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    color: "white",
                    width: 60,
                    textAlign: "left",
                  }}
                >
                  Active
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* ── Skeleton rows while loading ── */}
              {loading &&
                Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {/* Action icon placeholder */}
                    <TableCell>
                      <Skeleton variant="circular" width={24} height={24} />
                    </TableCell>
                    {/* Text cell skeletons – vary widths for realism */}
                    {[90, 75, 110, 95, 130, 60, 80, 40].map((w, j) => (
                      <TableCell key={j}>
                        <Skeleton
                          variant="text"
                          width={`${w}%`}
                          height={16}
                          sx={{ borderRadius: 1 }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {/* ── Real data rows ── */}
              {!loading &&
                pagedRows.map((row, index) => (
                  <TableRow
                    key={row.CUST_LOGIN_ID ?? index}
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
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{row.NAME}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {row.CUST_USER_ID}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {row.CUSTOMER_NAME}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {row.CUST_DEPT_NAME}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: "primary.main" }}>
                      {row.EMAIL}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Chip
                        label={row.LOGIN_TYPE}
                        size="small"
                        color={loginTypeColor[row.LOGIN_TYPE] || "default"}
                      />
                    </TableCell>
                    <TableCell>{row.MOBILE}</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {row.ACTIVE}
                    </TableCell>
                  </TableRow>
                ))}

              {/* ── Empty state ── */}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS.length}
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
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>
    </>
  );
};

export default UserCreationTable;
