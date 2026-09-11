import { useState } from "react";
import { DebugScreen } from "./components/DebugScreen";
import { GameView } from "./components/GameView";
import { FistDebugScreen } from "./components/FistDebugScreen";
import { SwordPreviewScreen } from "./components/SwordPreviewScreen";

type Mode = "play" | "debug" | "fist" | "sword";

export function App() {
  const [mode, setMode] = useState<Mode>("play");

  if (mode === "play") {
    return <GameView />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-surface-container-lowest text-on-surface">
      <nav className="flex items-center gap-3 px-4 py-2 bg-surface-container border-b border-outline-variant text-xs z-50">
        <span className="font-bold text-primary mr-2 tracking-wider uppercase">PhoneBlade</span>
        <button
          className="px-3 py-1 rounded font-label-sm uppercase tracking-wider cursor-pointer text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          onClick={() => setMode("play")}
        >
          Play Arena
        </button>
        <button
          className={`px-3 py-1 rounded font-label-sm uppercase tracking-wider cursor-pointer ${
            mode === "debug"
              ? "bg-primary-container text-on-primary-container font-bold shadow-sm shadow-primary-container/30"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          }`}
          onClick={() => setMode("debug")}
        >
          Debug (swing)
        </button>
        <button
          className={`px-3 py-1 rounded font-label-sm uppercase tracking-wider cursor-pointer ${
            mode === "fist"
              ? "bg-primary-container text-on-primary-container font-bold shadow-sm shadow-primary-container/30"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          }`}
          onClick={() => setMode("fist")}
        >
          Fist (track)
        </button>
        <button
          className={`px-3 py-1 rounded font-label-sm uppercase tracking-wider cursor-pointer ${
            mode === "sword"
              ? "bg-primary-container text-on-primary-container font-bold shadow-sm shadow-primary-container/30"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
          }`}
          onClick={() => setMode("sword")}
        >
          Sword (preview)
        </button>
      </nav>
      <div className="flex-1 min-h-0">
        {mode === "debug" && <DebugScreen />}
        {mode === "fist" && <FistDebugScreen />}
        {mode === "sword" && <SwordPreviewScreen />}
      </div>
    </div>
  );
}
