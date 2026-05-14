import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
  Box,
  CssBaseline,
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  IconButton,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import MuiDrawer from "@mui/material/Drawer";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Outlet, useNavigate } from "react-router";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import secureLocalStorage from "react-secure-storage";
import { updateloginpasswords } from "../Services/UserCreation.services";
import { showAlert, showError } from "../Components/swal_alert";
import Loading from "../Components/loading";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useState } from "react";
import {
  InputAdornment,
  CircularProgress, // ← loading spinner
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open
    ? {
        ...openedMixin(theme),
        "& .MuiDrawer-paper": openedMixin(theme),
      }
    : {
        ...closedMixin(theme),
        "& .MuiDrawer-paper": closedMixin(theme),
      }),
}));

export default function MiniDrawer() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oldPasswordError, setOldPasswordError] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState("");
  const handleChangePasswordOpen = () => {
    setChangePasswordOpen(true);
    setAnchorEl(null);
  };

  const handleChangePasswordClose = () => {
    setChangePasswordOpen(false);
    setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordError("");
    setOldPasswordError("");
    setNewPasswordError("");
  };

  const handlePasswordSubmit = async () => {
    setOldPasswordError("");
    setPasswordError("");

    if (!passwords.oldPassword) {
      setOldPasswordError("Old password is required.");
      return;
    }
    if (!passwords.newPassword) {
      setPasswordError("New password is required.");
      return;
    }
    if (!passwords.confirmPassword) {
      setPasswordError("Please confirm your new password.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwords.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const cust_login_id = secureLocalStorage.getItem("CUST_LOGIN_ID");

      const payload = {
        cust_login_id,
        old_password: passwords.oldPassword,
        new_password: passwords.newPassword,
        confirm_password: passwords.confirmPassword,
      };

      const res = await updateloginpasswords(payload);

      if (res?.Status === 1) {
        handleChangePasswordClose();
        showAlert("success", "Password Updated Successfully");
      }
    } catch (error) {
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message || "";
      const msg = apiMessage.toLowerCase();

      if (statusCode === 400 && msg.includes("old password is incorrect")) {
        setOldPasswordError(apiMessage);
      } else if (statusCode === 400 && msg.includes("different")) {
        setNewPasswordError(apiMessage);
      } else if (statusCode === 400) {
        setPasswordError(apiMessage || "Validation error.");
      } else {
        setPasswordError(apiMessage || "Password update failed.");
      }
    } finally {
      setLoading(false);
    }
  };
  let isSectionHead = secureLocalStorage.getItem("LOGIN_TYPE") === "SH";
  let isAdmin = secureLocalStorage.getItem("LOGIN_TYPE") === "A";

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  let LogoutUser = (e) => {
    e.preventDefault();
    navigate("/");
    secureLocalStorage.clear();
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={[{ marginRight: 5 }, open && { display: "none" }]}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            SIRI Service Desk
          </Typography>

          {/* Profile Avatar */}
          <IconButton onClick={handleProfileMenuOpen} color="inherit">
            <Avatar alt="User Avatar" />
          </IconButton>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={isMenuOpen}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={handleChangePasswordOpen}>
              Change Password
            </MenuItem>
            <MenuItem onClick={LogoutUser}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === "rtl" ? (
              <ChevronRightIcon />
            ) : (
              <ChevronLeftIcon />
            )}
          </IconButton>
        </DrawerHeader>
        <Divider />

        <List>
          {/*  User & Section Head only — hidden for Admin */}
          {!isAdmin && (
            <>
              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate("create-ticket")}>
                  <ListItemIcon>
                    <ConfirmationNumberIcon />
                  </ListItemIcon>
                  <ListItemText primary="Create Ticket" />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate("open-ticket")}>
                  <ListItemIcon>
                    <ListAltRoundedIcon />
                  </ListItemIcon>
                  <ListItemText primary="Raised Ticket" />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate("CompletedTickets")}>
                  <ListItemIcon>
                    <TaskAltIcon />
                  </ListItemIcon>
                  <ListItemText primary="Completed Ticket" />
                </ListItemButton>
              </ListItem>

              {/*  Section Head only */}
              {isSectionHead && (
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => navigate("SectionHeadDashboard")}
                  >
                    <ListItemIcon>
                      <GavelRoundedIcon />
                    </ListItemIcon>
                    <ListItemText primary="Section Dashboard" />
                  </ListItemButton>
                </ListItem>
              )}
            </>
          )}

          {/*  Admin only */}
          {isAdmin && (
            <>
              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate("AdminDashBoard")}>
                  <ListItemIcon>
                    <AdminPanelSettingsRoundedIcon />
                  </ListItemIcon>
                  <ListItemText primary="Admin Dashboard" />
                </ListItemButton>
              </ListItem>

              {/* Users */}
              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate("UserCreation")}>
                  <ListItemIcon>
                    <PersonAddAlt1RoundedIcon />
                  </ListItemIcon>
                  <ListItemText primary="Users" />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>
      </Drawer>

      <Box component="main" sx={{ width: "100%", overflow: "auto" }}>
        <DrawerHeader />
        <Outlet />
      </Box>
      <Dialog
        open={changePasswordOpen}
        onClose={handleChangePasswordClose}
        disableEnforceFocus
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "20px",
            overflow: "hidden",
            border: "0.5px solid",
            borderColor: "divider",
            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, pt: 3, pb: 0 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: "#EEEDFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 1.5,
            }}
          >
            <LockOutlinedIcon sx={{ color: "#534AB7", fontSize: 20 }} />
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: "1.05rem" }}>
            Change password
          </Typography>
          <Typography
            sx={{
              fontSize: "0.8rem",
              color: "text.secondary",
              mt: 0.3,
              mb: 0.5,
            }}
          >
            Keep your account secure with a strong password
          </Typography>
        </Box>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "20px !important",
            px: 3,
            overflow: "hidden",
          }}
        >
          {/* Current Password */}

          <TextField
            label="Current password"
            type={showOldPassword ? "text" : "password"} // 👈
            fullWidth
            size="small"
            value={passwords.oldPassword}
            onChange={(e) => {
              setPasswords({ ...passwords, oldPassword: e.target.value });
              setOldPasswordError("");
              setPasswordError("");
              setNewPasswordError("");
            }}
            error={!!oldPasswordError}
            helperText={oldPasswordError}
            slotProps={{
              input: {
                sx: { borderRadius: "10px", fontSize: "0.875rem" },
                endAdornment: (
                  <InputAdornment position="end">
                    {oldPasswordError ? (
                      <CancelIcon sx={{ color: "error.main", fontSize: 18 }} />
                    ) : (
                      <IconButton
                        onClick={() => setShowOldPassword(!showOldPassword)} // 👈
                        edge="end"
                        size="small"
                      >
                        {showOldPassword ? (
                          <VisibilityOff sx={{ fontSize: 18 }} />
                        ) : (
                          <Visibility sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* New Password */}
          <TextField
            label="New password"
            type={showNewPassword ? "text" : "password"}
            fullWidth
            size="small"
            value={passwords.newPassword}
            onChange={(e) => {
              setPasswords({ ...passwords, newPassword: e.target.value });
              setNewPasswordError("");
              setPasswordError("");
              setOldPasswordError("");
            }}
            error={!!newPasswordError}
            helperText={newPasswordError}
            slotProps={{
              input: {
                sx: { borderRadius: "10px", fontSize: "0.875rem" },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                      size="small"
                    >
                      {showNewPassword ? (
                        <VisibilityOff sx={{ fontSize: 18 }} />
                      ) : (
                        <Visibility sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Confirm Password */}
          <TextField
            label="Confirm new password"
            type="password"
            fullWidth
            size="small"
            value={passwords.confirmPassword}
            onChange={(e) => {
              setPasswords({ ...passwords, confirmPassword: e.target.value });
              setPasswordError("");
              setOldPasswordError("");
              setNewPasswordError("");
            }}
            error={!!passwordError}
            helperText={passwordError}
            slotProps={{
              input: {
                sx: { borderRadius: "10px", fontSize: "0.875rem" },
                endAdornment: passwords.confirmPassword ? (
                  <InputAdornment position="end">
                    {passwords.newPassword === passwords.confirmPassword ? (
                      <CheckCircleIcon
                        sx={{ color: "success.main", fontSize: 18 }}
                      />
                    ) : (
                      <CancelIcon sx={{ color: "error.main", fontSize: 18 }} />
                    )}
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2, gap: 1.5 }}>
          <Button
            onClick={handleChangePasswordClose}
            fullWidth
            disabled={loading}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.875rem",
              border: "0.5px solid",
              borderColor: "divider",
              color: "text.secondary",
              bgcolor: "background.default",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePasswordSubmit}
            fullWidth
            disabled={loading}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.875rem",
              bgcolor: "#534AB7",
              color: "#fff",
              boxShadow: "none",
              "&:hover": { bgcolor: "#3C3489", boxShadow: "none" },
              "&:disabled": { bgcolor: "#AFA9EC", color: "#fff" },
            }}
          >
            {loading ? (
              <CircularProgress size={18} sx={{ color: "#fff" }} />
            ) : (
              "Update password"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
