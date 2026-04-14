import { createTheme } from "@mui/material/styles";
import {
  outlinedInputClasses,
  inputBaseClasses,
  formLabelClasses,
} from "@mui/material";

/**
 * App-wide MUI theme configuration.
 * Supports both light and dark color schemes via MUI's colorSchemes API.
 * Includes global overrides for TextField and Button components.
 */
const theme = createTheme({
  // Light and dark palette definitions
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#6F60C1" },
        secondary: { main: "#5C6BC0" },
        background: {
          default: "#f5f5fb",
          paper: "#ffffff",
        },
        text: {
          primary: "#000",
        },
      },
    },

    dark: {
      palette: {
        primary: { main: "#6F60C1" },
        secondary: { main: "#5C6BC0" },
        background: {
          default: "#0f1020",
          paper: "#1b1c30",
        },
        text: {
          primary: "#fff",
        },
      },
    },
  },

  // Global border radius applied to all MUI components
  shape: { borderRadius: 12 },

  components: {
    // Global TextField overrides applied across all form inputs
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "small",
        fullWidth: true,
      },

      styleOverrides: {
        root: ({ theme }) => {
          // Reusable color helpers based on current color mode
          const isLight = theme.palette.mode === "light";
          const textColor = isLight ? "#000" : "#fff";

          return {
            // Outlined border styling per color mode
            [`& .${outlinedInputClasses.root} fieldset`]: {
              borderColor: isLight ? "#000" : "#ffffff99",
              borderWidth: "1px",
              borderRadius: "5px",
            },

            // Input text styling — controls font size, weight, and height
            [`& .${inputBaseClasses.input}`]: {
              height: "15px",
              display: "flex",
              alignItems: "center",
              fontSize: 12,
              fontWeight: "bold",
              color: textColor,
            },

            // Floating label styling
            [`& .${formLabelClasses.root}`]: {
              fontWeight: "bold",
              fontSize: 13,
              marginTop: "-2px",
              height: "18px",
              color: textColor,
            },
          };
        },
      },
    },

    // MuiButton default props — disabled: false is MUI's default, kept for explicit clarity
    MuiButton: {
      defaultProps: {
        disabled: false,
      },
    },
  },
});

export default theme;