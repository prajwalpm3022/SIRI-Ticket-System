import { Grid, TextField, Button, Typography, Box, Paper } from "@mui/material";

const DepartmentCreationForm = ({
  form,
  errors,
  isEditing,
  onChange,
  onSave,
  onUpdate,
  onReset,
}) => {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          {isEditing ? "Edit Department" : "New Department"}
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              required
              label="Department Name"
              placeholder="e.g. MIS DEPARTMENT"
              value={form.cust_dept_name}
              onChange={(e) => onChange("cust_dept_name", e.target.value)}
              error={!!errors.cust_dept_name}
              helperText={errors.cust_dept_name || ""}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              required
              label="Short Name"
              placeholder="e.g. MIS"
              value={form.short_name}
              onChange={(e) => onChange("short_name", e.target.value)}
              inputProps={{ maxLength: 5 }}
              error={!!errors.short_name}
              helperText={errors.short_name}
            />
          </Grid>
        </Grid>
      </Box>

      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
        }}
      >
        <Button
          variant="contained"
          color={isEditing ? "success" : "primary"}
          onClick={isEditing ? onUpdate : onSave}
        >
          {isEditing ? "Update" : "Save"}
        </Button>
        <Button
          variant="contained"
          color="error"
          size="small"
          onClick={onReset}
        >
          Clear
        </Button>
      </Box>
    </Paper>
  );
};

export default DepartmentCreationForm;
