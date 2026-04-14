import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./Components/ErrorBoundary";

import { HashRouter } from "react-router";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    </HashRouter>
  </StrictMode>,
);
