interface CyberHeaderProps {
  activeTab: string;
  onTabSelect: (tab: string) => void;
  audioMuted: boolean;
  onToggleAudio: () => void;
  fps?: number;
  cameraReady?: boolean;
}

export function CyberHeader({
  activeTab,
  onTabSelect,
  audioMuted,
  onToggleAudio,
  fps = 60,
  cameraReady = false,
}: CyberHeaderProps) {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-40 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-primary-container/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      <div className="h-16 w-full px-6 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.5)]">
            <span className="material-symbols-outlined text-surface-container-lowest text-[22px] font-bold">
              swords
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-[18px] uppercase tracking-wider text-primary font-bold drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
              Phone<span className="text-primary-container">Blade</span>
            </span>
            <span className="font-label-sm text-[10px] text-outline tracking-widest uppercase">
              Cybernetic Blade Engine
            </span>
          </div>

          {/* Telemetry Micro Badges */}
          <div className="hidden xl:flex items-center gap-2 pl-4 ml-2 border-l border-outline-variant">
            <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded border border-outline-variant">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-label-sm text-[11px] text-secondary font-bold tracking-wider">
                [{fps} FPS]
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded border border-outline-variant">
              <span className="material-symbols-outlined text-primary text-[14px]">
                {cameraReady ? "videocam" : "videocam_off"}
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant font-medium tracking-wide uppercase">
                {cameraReady ? "TRACKING: ACTIVE" : "CAM: STANDBY"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-2">
          {[
            { id: "arena", label: "Arena" },
            { id: "dojo", label: "Dojo Calibration" },
            { id: "armory", label: "Blade Armory" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabSelect(tab.id)}
                className={`px-4 py-1.5 font-label-md text-[12px] uppercase tracking-wider rounded transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-bold shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Quick Utilities */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded border border-outline-variant">
            <button
              onClick={onToggleAudio}
              aria-label="Toggle Audio"
              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors cursor-pointer"
              title={audioMuted ? "Unmute Audio" : "Mute Audio"}
            >
              <span className="material-symbols-outlined text-[18px]">
                {audioMuted ? "volume_off" : "volume_up"}
              </span>
            </button>
            <button
              onClick={toggleFullscreen}
              aria-label="Toggle Fullscreen"
              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              <span className="material-symbols-outlined text-[18px]">
                fullscreen
              </span>
            </button>
          </div>

          <div
            className="w-8 h-8 rounded-full bg-primary-container/20 border border-primary-container/50 flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.3)] cursor-pointer"
            title="User Profile"
          >
            <span className="material-symbols-outlined text-primary-container text-[18px]">
              person
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
