import {
  Grid,
  TextField,
  Autocomplete,
  Switch,
  Button,
  Typography,
  Box,
  Divider,
  Paper,
} from "@mui/material";
import { InputAdornment, IconButton } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const LOGIN_TYPES = [
  { value: "CU", label: "Customer" },
  { value: "SH", label: "Section Incharge" },
];

const UserCreationForm = ({
  form,
  errors,
  departments,
  isEditing,
  showPassword,
  showConfirmPassword,
  setShowPassword,
  setShowConfirmPassword,
  onFieldChange,
  onSave,
  onUpdate,
  onReset,
}) => {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              options={departments}
              getOptionLabel={(option) => option.CUST_DEPT_NAME ?? ""}
              isOptionEqualToValue={(option, value) =>
                option.CUST_DEPT_ID === value?.CUST_DEPT_ID
              }
              value={form.department}
              onChange={(_, val) => onFieldChange("department", val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Department"
                  size="small"
                  required
                  placeholder="Select department…"
                  error={!!errors.department}
                  helperText={errors.department || ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              required
              label="Name"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              error={!!errors.name}
              helperText={errors.name || ""}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              required
              label="Username"
              placeholder="e.g. john_doe"
              value={form.username}
              onChange={(e) => onFieldChange("username", e.target.value)}
              error={!!errors.username}
              helperText={errors.username || ""}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              required
              label="Email"
              type="email"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              error={!!errors.email}
              helperText={errors.email || ""}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              required
              label="Mobile no."
              type="tel"
              placeholder="00000 00000"
              value={form.mobile}
              onChange={(e) => onFieldChange("mobile", e.target.value)}
              error={!!errors.mobile}
              helperText={errors.mobile || ""}
              inputProps={{ maxLength: 10 }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              required
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => onFieldChange("password", e.target.value)}
              error={!!errors.password}
              helperText={errors.password || ""}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                    >
                      {showPassword ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              required
              label="Confirm password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => onFieldChange("confirmPassword", e.target.value)}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword || ""}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      edge="end"
                    >
                      {showConfirmPassword ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Autocomplete
              options={LOGIN_TYPES}
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(o, v) => o.value === v.value}
              value={form.loginType}
              onChange={(_, val) => onFieldChange("loginType", val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Login type"
                  size="small"
                  required
                  placeholder="Select login type…"
                  error={!!errors.loginType}
                  helperText={errors.loginType || ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 1.5,
                py: 1,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "action.hover",
              }}
            >
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  Active
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={form.active ? "success.main" : "error.main"}
                >
                  {form.active ? "Yes" : "No"}
                </Typography>
              </Box>
              <Switch
                checked={form.active}
                onChange={(e) => onFieldChange("active", e.target.checked)}
                color="success"
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Divider />

      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
        }}
      >
        <Button
          variant="contained"
          size="small"
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

export { LOGIN_TYPES };
export default UserCreationForm;
