import { useEffect, useMemo, useState } from "react";

// Pulse keyframe animation injected once into the document head at mount
const KEYFRAMES = `
@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
`;

/**
 * CircularBubbleLoading
 *
 * Full-screen overlay spinner with 8 orbiting bubbles and an animated
 * loading text label. Injects its keyframe CSS into the document head
 * on mount and removes it on unmount.
 *
 * @param {string} text - Label shown below the spinner (default: "Loading")
 */
const MESSAGES = ["Loading..."];

const CircularBubbleLoading = ({ text, messages = MESSAGES }) => {
  const [dots, setDots] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages]);

  const displayText = text ?? messages[msgIndex];
  // ...
  return (
    // ...
    <div style={styles.text}>
      {displayText}
      {dots}
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(255,255,255,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  circle: {
    position: "relative",
    width: "60px",
    height: "60px",
    marginBottom: "10px",
  },
  bubble: {
    position: "absolute",
    width: "10px",
    height: "10px",
    backgroundColor: "#1976d2",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
    opacity: 0.3,
    animation: "pulse 1s infinite ease-in-out",
  },
  text: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#1976d2",
  },
};

export default CircularBubbleLoading;
