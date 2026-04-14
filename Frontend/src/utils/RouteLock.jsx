import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * RouteLock
 * Prevents users from manually typing URLs or using the browser's address bar
 * to navigate to arbitrary routes.
 *
 * Navigation is only permitted when a button or link explicitly sets the
 * "nav_by_button" flag in sessionStorage before changing the route.
 * Any navigation that does not set this flag is reverted to the last valid path.
 *
 * Usage: Render this component once inside the Router, above the route definitions.
 * In any navigation handler: sessionStorage.setItem("nav_by_button", "true")
 *
 * @returns {null} Renders nothing — purely a navigation side-effect component
 */
const RouteLock = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Tracks the last path that was reached via a legitimate button-based navigation
  const lastValidPath = useRef(location.pathname);

  useEffect(() => {
    const isButtonNavigation =
      sessionStorage.getItem("nav_by_button") === "true";

    if (isButtonNavigation) {
      // Legitimate navigation — update the valid path reference and clear the flag
      lastValidPath.current = location.pathname;
      sessionStorage.removeItem("nav_by_button");
    } else {
      // Unauthorized navigation (manual URL change) — revert to last valid path
      navigate(lastValidPath.current, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};

export default RouteLock;
