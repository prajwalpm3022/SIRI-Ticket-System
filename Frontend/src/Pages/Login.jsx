import React, { useState } from "react";
import {
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  PersonOutline,
  LockOutlined,
} from "@mui/icons-material";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import { useNavigate } from "react-router-dom";
import sirilogo from "../assets/Siri-Logo.png";
import { CustomerLogin, ForgotPassword } from "../Services/Login.Services";
import { showAlert } from "../Components/swal_alert";
import CircularBubbleLoading from "../Components/loading";
import secureLocalStorage from "react-secure-storage";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({
      ...prev,
      [name]: value.trim()
        ? ""
        : `${name === "username" ? "Username" : "Password"} is required`,
    }));
  };

  const handleLogin = async () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.password.trim()) newErrors.password = "Password is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsAuthenticating(true);
    try {
      const response = await CustomerLogin({
        CUST_USER_ID: formData.username,
        CUST_PASSWORD: formData.password,
      });

      if (response?.Status === 1) {
        secureLocalStorage.setItem("AUTH_TOKEN", response?.items?.token);
        secureLocalStorage.setItem("USER_ID", response?.items?.userId);
        secureLocalStorage.setItem("DEPT_ID", response?.items?.deptId);
        secureLocalStorage.setItem("DEPT_NAME", response?.items?.deptName);
        secureLocalStorage.setItem("LOGIN_TYPE", response?.items?.login_type);
        secureLocalStorage.setItem("CUST_LOGIN_ID", response?.items?.loginId);
        secureLocalStorage.setItem(
          "CUST_SHORT_NAME",
          response?.items?.CustshortName,
        );
        secureLocalStorage.setItem(
          "DEPT_SHORT_NAME",
          response?.items?.DeptshortName,
        );

        const loginType = response?.items?.login_type;
        const route =
          loginType === "SH"
            ? "/Drawer"
            : loginType === "A"
              ? "/Drawer/AdminDashBoard"
              : "/Drawer/open-ticket";

        navigate(route, { replace: true });
        return; // skip finally — component unmounting
      }
    } catch (error) {
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      const retryMinutes = error?.response?.data?.retryAfterMinutes; // ← from your backend
      const retrySeconds = error?.response?.data?.retryAfterSeconds;

      if (statusCode === 429) {
        // ← new: rate limit hit
        showAlert(
          "warning",
          "Too Many Attempts",
          retryMinutes
            ? `Too many login attempts. Please try again in ${retryMinutes} minute${retryMinutes > 1 ? "s" : ""}.`
            : "Too many login attempts. Please try again later.",
        );
      } else if (statusCode === 403 && apiMessage) {
        showAlert("warning", "Account Inactive", apiMessage);
      } else if (statusCode === 401) {
        showAlert(
          "error",
          "Login Failed",
          apiMessage || "Invalid credentials.",
        );
      } else {
        showAlert(
          "error",
          "Login Failed",
          apiMessage || "Something went wrong.",
        );
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotEmailError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotEmailError("Enter a valid email address");
      return;
    }
    setForgotLoading(true);
    try {
      await ForgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (error) {
      setForgotEmailError(
        error?.response?.data?.message || "Something went wrong",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotClose = () => {
    setForgotOpen(false);
    setForgotEmail("");
    setForgotEmailError("");
    setForgotSuccess(false);
    setForgotLoading(false);
  };

  return (
    <>
      <Grid container minHeight="100vh">
        {/* LEFT PANEL */}
        <Grid
          size={{ xs: 0, md: 6 }}
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            mt: -10,
            px: 10,
            background: "linear-gradient(160deg, #5f63c6 0%, #3c3f9f 100%)",
            color: "#fff",
          }}
        >
          <ConfirmationNumberIcon sx={{ fontSize: 96, mb: 3, opacity: 0.9 }} />
          <Typography variant="h3" fontWeight={800} letterSpacing={-1}>
            SIRI ServiceDesk
          </Typography>
          <Typography
            variant="h6"
            sx={{ mt: 1, opacity: 0.8, fontWeight: 300 }}
          >
            One platform. Every Co-operative. Zero delays.
          </Typography>
        </Grid>

        {/* RIGHT PANEL */}
        <Grid
          size={{ xs: 12, md: 6 }}
          component={Paper}
          elevation={0}
          square
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fafafa",
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 500, px: 3 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" fontWeight={700}>
                Sign in
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Use your credentials to access your account
              </Typography>
            </Box>

            <Box>
              <TextField
                fullWidth
                label="User ID"
                name="username"
                margin="normal"
                required
                value={formData.username}
                onChange={handleInputChange}
                error={!!errors.username}
                helperText={errors.username}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                margin="normal"
                required
                value={formData.password}
                onChange={handleInputChange}
                error={!!errors.password}
                helperText={errors.password}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((p) => !p)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />

              <Box textAlign="right" mt={1}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#6367C0",
                    cursor: "pointer",
                    fontWeight: 600,
                    "&:hover": { textDecoration: "underline" },
                  }}
                  onClick={() => setForgotOpen(true)}
                >
                  Forgot Password?
                </Typography>
              </Box>

              <Button
                fullWidth
                type="button"
                size="large"
                variant="contained"
                disabled={isAuthenticating}
                onClick={handleLogin}
                startIcon={
                  isAuthenticating ? (
                    <CircularProgress size={18} sx={{ color: "#fff" }} />
                  ) : null
                }
                sx={{
                  mt: 3,
                  py: 1.4,
                  borderRadius: 2,
                  backgroundColor: "#6367C0",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  boxShadow: "0 6px 16px rgba(99,103,192,0.35)",
                  "&:hover": { backgroundColor: "#5458b3" },
                  "&.Mui-disabled": {
                    backgroundColor: "#6367C0",
                    opacity: 0.85,
                    color: "#fff",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                {isAuthenticating ? "Signing in..." : "Sign In"}
              </Button>
            </Box>

            <Divider sx={{ my: 5 }} />
            <Box textAlign="center">
              <img src={sirilogo} alt="Siri Logo" style={{ width: "250px" }} />
              <Typography
                variant="body2"
                color="text.secondary"
                display="block"
                mt={2}
              >
                © 2026 Ticket Rising. All rights reserved.
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Forgot Password Dialog */}
      <Dialog
        open={forgotOpen}
        onClose={handleForgotClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#6367C0" }}>
          Reset Password
        </DialogTitle>
        <DialogContent>
          {forgotSuccess ? (
            <Box textAlign="center" py={2}>
              <Typography variant="h6" color="success.main" fontWeight={700}>
                ✅ Email Sent!
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                A password reset link has been sent to{" "}
                <strong>{forgotEmail}</strong>. Please check your inbox.
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Enter your registered email address. We'll send you a link to
                reset your password.
              </Typography>
              <TextField
                fullWidth
                label="Email Address"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  setForgotEmailError("");
                }}
                error={!!forgotEmailError}
                helperText={forgotEmailError}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleForgotClose}
            sx={{ textTransform: "none", color: "#666" }}
          >
            {forgotSuccess ? "Close" : "Cancel"}
          </Button>
          {!forgotSuccess && (
            <Button
              variant="contained"
              onClick={handleForgotPassword}
              disabled={forgotLoading}
              startIcon={
                forgotLoading ? (
                  <CircularProgress size={16} sx={{ color: "#fff" }} />
                ) : null
              }
              sx={{
                textTransform: "none",
                backgroundColor: "#6367C0",
                borderRadius: 2,
                "&:hover": { backgroundColor: "#5458b3" },
                "&.Mui-disabled": {
                  backgroundColor: "#6367C0",
                  opacity: 0.85,
                  color: "#fff",
                },
              }}
            >
              {forgotLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
