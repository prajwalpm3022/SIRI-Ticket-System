import { Component } from "react";
import { Box, Typography, Button, Paper } from "@mui/material";

/**
 * ErrorBoundary
 *
 * Class component that catches unhandled React render errors and displays
 * a user-friendly fallback UI instead of a blank or broken page.
 * In development mode, the raw error and component stack are shown to aid debugging.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // Sets hasError flag synchronously so the fallback UI renders on the same cycle
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // Captures the full error and component stack for dev-mode display
  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  // Clears error state and redirects to the home route
  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            backgroundColor: "#f5f5f5",
            p: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{ p: 4, maxWidth: 600, textAlign: "center" }}
          >
            <Typography variant="h4" color="error" gutterBottom>
              Something went wrong
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We encountered an unexpected error. Please try refreshing the page
              or contact support if the problem persists.
            </Typography>

            {/* Dev-only: raw error message and component stack for debugging */}
            {import.meta.env.DEV && this.state.error && (
              <Box
                sx={{
                  textAlign: "left",
                  backgroundColor: "#f5f5f5",
                  p: 2,
                  borderRadius: 1,
                  mb: 3,
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{ fontSize: 11 }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={this.handleReset}
            >
              Return to Home
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
