import { createTheme } from "@mui/material/styles";
import {
  outlinedInputClasses,
  inputBaseClasses,
  formLabelClasses,
} from "@mui/material";

/**
 * Login page-specific MUI theme.
 * Uses a glassmorphism style with semi-transparent backgrounds and blur effects.
 * Supports light and dark color schemes with bold purple (#6765C1) branding.
 */
const loginTheme = createTheme({
  cssVarPrefix: "app",
  defaultColorScheme: "light",

  colorSchemes: {
    light: {
      palette: { mode: "light" },
    },
    dark: {
      palette: { mode: "dark" },
    },
  },

  // Shared bold heading typography for h2, h3, h5 across light and dark modes
  typography: {
    h2: { fontWeight: "bold" },
    h3: { fontWeight: "bold" },
    h5: { fontWeight: "bold" },
  },

  components: {
    // TextField overrides — glassmorphism style with purple accent color
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "small",
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          // Outlined border with purple accent and rounded corners
          [`& .${outlinedInputClasses.root} fieldset`]: {
            borderColor: "#6765C1",
            borderWidth: "1px",
            borderRadius: "10px",
          },

          // Input base — controls height, font, and text color
          [`& .${inputBaseClasses.input}`]: {
            height: "28px",
            display: "flex",
            alignItems: "center",
            color: "#6765C1",
            fontSize: 12,
            fontWeight: "bold",
            backgroundColor: "rgba(255, 255, 255, 0.5)",
          },

          // Floating label color and weight
          [`& .${formLabelClasses.root}`]: {
            fontWeight: "bold",
            color: "#6765C1",
          },

          // Autofill fix — prevents browser from overriding background with yellow/purple
          // Uses a large inset box-shadow trick to simulate transparent background
          "& input:-webkit-autofill": {
            WebkitBoxShadow: "0 0 0 1000px rgba(255, 255, 255, 0.5) inset",
            WebkitTextFillColor: "#6765C1",
            transition: "background-color 9999s ease-in-out 0s",
          },
        },
      },
    },

    // Autocomplete dropdown — glassmorphism style matching TextField
    MuiAutocomplete: {
      styleOverrides: {
        // Dropdown paper container with blur effect
        paper: {
          backgroundColor: "rgba(255, 255, 255, 0.5)",
          backdropFilter: "blur(6px)",
          // Note: boxShadow: "5px" is invalid — needs format like "0px 5px 10px rgba(0,0,0,0.2)"
          // Removed to avoid rendering issues; add a valid value if shadow is needed
        },

        // Listbox background matches paper for visual consistency
        listbox: {
          backgroundColor: "rgba(255, 255, 255, 0.5)",
        },

        // Individual option styling with hover highlight
        option: {
          backgroundColor: "rgba(255, 255, 255, 0.5)",
          fontWeight: "bold",
          color: "#6765C1",
          "&:hover": {
            backgroundColor: "rgba(103, 101, 193, 0.3)",
          },
        },

        // Dropdown arrow icon color
        popupIndicator: {
          color: "black",
        },

        // Clear (x) icon color
        clearIndicator: {
          color: "black",
        },
      },
    },

    // Paper — transparent with no shadow for glassmorphism layout
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
          boxShadow: "none",
        },
      },
    },
  },
});

export default loginTheme;