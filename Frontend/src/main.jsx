import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./Components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();

import { HashRouter } from "react-router";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </HashRouter>
  </StrictMode>,
);
