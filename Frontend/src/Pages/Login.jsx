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
import { CustomerLogin } from "../Services/Login.Services";
import { showAlert } from "../Components/swal_alert";
import CircularBubbleLoading from "../Components/loading";
import secureLocalStorage from "react-secure-storage";
export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    username: "",
    password: "",
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const navigate = useNavigate();
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (!value.trim()) {
      setErrors((prev) => ({
        ...prev,
        [name]: `${name === "username" ? "Username" : "Password"} is required`,
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    let newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsAuthenticating(true);
    try {
      let response = await CustomerLogin({
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

        if (secureLocalStorage.getItem("LOGIN_TYPE") === "SH") {
          navigate("/Drawer");
        } else if (secureLocalStorage.getItem("LOGIN_TYPE") === "A") {
          navigate("/Drawer/AdminDashBoard");
        } else {
          navigate("/Drawer/open-ticket");
        }
      }
    } catch (error) {
      console.error(error);
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message;

      if (statusCode === 403 && apiMessage) {
        // Inactive user
        showAlert("warning", "Account Inactive", apiMessage);
      } else if (statusCode === 401) {
        // Wrong credentials
        showAlert(
          "error",
          "Login Failed",
          apiMessage ||
            "Invalid credentials. Please check your User ID and Password.",
        );
      } else {
        // Generic fallback
        showAlert(
          "error",
          "Login Failed",
          apiMessage || "Something went wrong. Please try again.",
        );
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <>
      {isAuthenticating && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.75)",
            zIndex: 9999,
            gap: 2,
          }}
        >
          <CircularBubbleLoading text={"Authenticating"} />
        </Box>
      )}
      <Grid container minHeight="100vh">
        {/* LEFT BRAND PANEL */}
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

        {/* RIGHT LOGIN PANEL */}
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
          <Box sx={{ width: "100%", maxWidth: 500, px: 1 }}>
            {/* HEADER */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" fontWeight={700}>
                Sign in
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Use your credentials to access your account
              </Typography>
            </Box>

            {/* FORM */}
            <form>
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

              <Button
                fullWidth
                type="submit"
                size="large"
                variant="contained"
                sx={{
                  mt: 4,
                  py: 1.4,
                  borderRadius: 2,
                  backgroundColor: "#6367C0",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  boxShadow: "0 6px 16px rgba(99,103,192,0.35)",
                  "&:hover": {
                    backgroundColor: "#5458b3",
                  },
                }}
                onClick={handleLogin}
              >
                Sign In
              </Button>
            </form>

            {/* FOOTER */}
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
    </>
  );
}
