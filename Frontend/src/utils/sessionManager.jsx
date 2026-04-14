/**
 * Session Manager
 * Handles session timeout and monitoring
 * @module utils/sessionManager
 */

const SESSION_TIMEOUT =
  parseInt(import.meta.env.VITE_SESSION_TIMEOUT_MS) || 30 * 60 * 1000; // 30 minutes default
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute

let sessionTimer = null;
let lastActivityTime = null;
let sessionCheckInterval = null;

/**
 * Starts a new session with timeout monitoring
 */
export function startSession() {
  lastActivityTime = Date.now();

  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }

  sessionCheckInterval = setInterval(() => {
    if (!isSessionValid()) {
      endSession();
      window.dispatchEvent(new CustomEvent("sessionExpired"));
    }
  }, SESSION_CHECK_INTERVAL);
}

/**
 * Ends the current session and clears timers
 */
export function endSession() {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }
  lastActivityTime = null;
}

/**
 * Updates last activity time to extend session
 */
export function updateActivity() {
  lastActivityTime = Date.now();
}

/**
 * Checks if current session is still valid
 * @returns {boolean}
 */
export function isSessionValid() {
  if (!lastActivityTime) {
    return false;
  }

  const elapsed = Date.now() - lastActivityTime;
  return elapsed < SESSION_TIMEOUT;
}

/**
 * Gets remaining session time in milliseconds
 * @returns {number}
 */
export function getRemainingTime() {
  if (!lastActivityTime) {
    return 0;
  }

  const elapsed = Date.now() - lastActivityTime;
  const remaining = SESSION_TIMEOUT - elapsed;
  return Math.max(0, remaining);
}

/**
 * Sets up activity listeners to track user interaction
 */
export function setupActivityListeners() {
  const events = ["mousedown", "keydown", "scroll", "touchstart"];

  events.forEach((event) => {
    document.addEventListener(event, updateActivity, { passive: true });
  });
}

/**
 * Removes activity listeners
 */
export function removeActivityListeners() {
  const events = ["mousedown", "keydown", "scroll", "touchstart"];

  events.forEach((event) => {
    document.removeEventListener(event, updateActivity);
  });
}
