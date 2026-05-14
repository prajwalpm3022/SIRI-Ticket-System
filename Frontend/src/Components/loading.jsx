import { useEffect, useState } from "react";

const KEYFRAMES = `
@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
`;

const MESSAGES = ["Loading..."];

const BUBBLE_COUNT = 8;
const RADIUS = 22;

const CircularBubbleLoading = ({ text, messages = MESSAGES, isLoading }) => {
  const [dots, setDots] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);

  // Inject keyframes into <head> on mount, remove on unmount
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = KEYFRAMES;
    style.id = "circular-bubble-keyframes";
    if (!document.getElementById("circular-bubble-keyframes")) {
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById("circular-bubble-keyframes");
      if (el) el.remove();
    };
  }, []);

  // Animate dots
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Cycle messages
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading, messages]);

  if (!isLoading) return null;

  const displayText = text ?? messages[msgIndex];

  // Calculate each bubble's position around the circle
  const bubbles = Array.from({ length: BUBBLE_COUNT }).map((_, i) => {
    const angle = (i / BUBBLE_COUNT) * 2 * Math.PI;
    const x = 30 + RADIUS * Math.cos(angle); // % from center
    const y = 30 + RADIUS * Math.sin(angle);
    return { x, y, delay: `${(i / BUBBLE_COUNT).toFixed(2)}s` };
  });

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.circle}>
          {bubbles.map((b, i) => (
            <div
              key={i}
              style={{
                ...styles.bubble,
                left: `${b.x}px`,
                top: `${b.y}px`,
                animationDelay: b.delay,
              }}
            />
          ))}
        </div>
        <div style={styles.text}>
          {displayText}
          {dots}
        </div>
      </div>
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
    marginBottom: "16px",
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
    minWidth: "140px",
    textAlign: "center",
  },
};

export default CircularBubbleLoading;
