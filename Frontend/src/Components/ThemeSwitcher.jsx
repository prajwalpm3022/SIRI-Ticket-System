import { Box, IconButton } from "@mui/material";
import { LightMode, DarkMode } from "@mui/icons-material";
import { useColorScheme } from "@mui/material/styles";

// ThemeSwitcher
// Renders a toggle button that switches between light and dark color modes.
// Uses MUI's useColorScheme hook to read and update the current mode.
export default function ThemeSwitcher() {
  const { mode, setMode } = useColorScheme();

  // Toggles between light and dark mode on each click
  const toggleMode = () => setMode(mode === "light" ? "dark" : "light");

  return (
    // Elevated z-index ensures the switcher stays above overlapping UI elements
    <Box sx={{ zIndex: 2000 }}>
      <IconButton
        onClick={toggleMode}
        color="inherit"
        sx={{ border: "1px solid", borderColor: "divider" }}
      >
        {/* Show DarkMode icon in light mode and LightMode icon in dark mode */}
        {mode === "light" ? <DarkMode /> : <LightMode />}
      </IconButton>
    </Box>
  );
}
