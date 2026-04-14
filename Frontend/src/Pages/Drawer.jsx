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
import DashboardIcon from "@mui/icons-material/Dashboard";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import secureLocalStorage from "react-secure-storage";
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
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const isMenuOpen = Boolean(anchorEl);
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
            <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
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
                    <DashboardIcon />
                  </ListItemIcon>
                  <ListItemText primary="Raised Ticket" />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate("CompletedTickets")}>
                  <ListItemIcon>
                    <ConfirmationNumberIcon />
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
                      <ConfirmationNumberIcon />
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
                    <ConfirmationNumberIcon />
                  </ListItemIcon>
                  <ListItemText primary="Admin Dashboard" />
                </ListItemButton>
              </ListItem>
              {/* Departments */}
              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate("DepartmentCreation")}>
                  <ListItemIcon>
                    <ConfirmationNumberIcon />
                  </ListItemIcon>
                  <ListItemText primary="Departments" />
                </ListItemButton>
              </ListItem>
              {/* Users */}
              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate("UserCreation")}>
                  <ListItemIcon>
                    <ConfirmationNumberIcon />
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
    </Box>
  );
}
