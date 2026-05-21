import { useState } from "react";
import { DebugScreen } from "./components/DebugScreen";
import { GameView } from "./components/GameView";
import { FistDebugScreen } from "./components/FistDebugScreen";

type Mode = "debug" | "play" | "fist";

export function App() {
  const [mode, setMode] = useState<Mode>("debug");
  return (
    <div style={rootStyle}>
      <nav style={navStyle}>
        <span style={brand}>PhoneBlade</span>
        <button
          style={tab(mode === "debug")}
          onClick={() => setMode("debug")}
        >
          Debug (swing)
        </button>
        <button
          style={tab(mode === "play")}
          onClick={() => setMode("play")}
        >
          Play (fruit)
        </button>
        <button
          style={tab(mode === "fist")}
          onClick={() => setMode("fist")}
        >
          Fist (track)
        </button>
      </nav>
      <div style={bodyStyle}>
        {mode === "debug" && <DebugScreen />}
        {mode === "play" && <GameView />}
        {mode === "fist" && <FistDebugScreen />}
      </div>
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  width: "100vw",
};

const navStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  background: "#10141a",
  borderBottom: "1px solid #1f2630",
  fontSize: 13,
};

const brand: React.CSSProperties = {
  fontWeight: 700,
  letterSpacing: 0.5,
  marginRight: 12,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
};

const tab = (active: boolean): React.CSSProperties => ({
  background: active ? "#7af0c8" : "transparent",
  color: active ? "#0b0d10" : "#cfd6df",
  border: "1px solid " + (active ? "#7af0c8" : "#2c3542"),
  borderRadius: 6,
  padding: "4px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
});
