interface StartGameModalProps {
  status: "idle" | "loading" | "error";
  errorMsg?: string;
  onStart: () => void;
  selectedMode: string;
  onSelectMode: (mode: string) => void;
}

export function StartGameModal({
  status,
  errorMsg,
  onStart,
  selectedMode,
  onSelectMode,
}: StartGameModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-surface-container-lowest/80 backdrop-blur-md">
      {/* Background Cyberpunk Grid & Flares */}
      <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Modal Card Shell */}
      <div className="relative w-full max-w-4xl rounded-2xl bg-surface-container-low/95 backdrop-blur-2xl border border-primary-container/30 shadow-2xl shadow-primary-container/10 p-6 sm:p-8 flex flex-col gap-6 overflow-hidden">
        {/* Top Header Deck: Mode Switcher & Security Micro-Badges */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
          {/* Mode Tabs */}
          <div className="flex items-center gap-1 p-1 bg-surface-container rounded-lg border border-outline-variant">
            {[
              { id: "classic", label: "Classic Arcade" },
              { id: "zen", label: "Zen Dojo" },
              { id: "armory", label: "Blade Armory" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMode(m.id)}
                className={`px-4 py-1.5 rounded font-label-sm text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                  selectedMode === m.id
                    ? "bg-primary-container text-on-primary-container font-bold shadow-md shadow-primary-container/20"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Privacy & Engine Badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container rounded border border-outline-variant font-label-sm text-[10px] text-secondary font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span>100% ON-DEVICE AI</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container rounded border border-outline-variant font-label-sm text-[10px] text-primary-fixed-dim tracking-wider uppercase">
              <span className="material-symbols-outlined text-[13px]">
                shield_lock
              </span>
              <span>ZERO CLOUD INGRESS</span>
            </div>
          </div>
        </div>

        {/* Brand Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-outline-variant/30">
          <div>
            <div className="flex items-center gap-2 text-primary-container font-label-sm text-[11px] tracking-widest uppercase">
              <span>[ OPTICAL KINETIC ENGINE ]</span>
              <span className="h-px w-6 bg-primary-container/40" />
              <span className="text-outline">SUB-MILLIMETER SPATIAL SLICE</span>
            </div>
            <div className="relative mt-1">
              <h1 className="font-display-hero text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-primary">
                PHONE<span className="text-primary-container">BLADE</span>
              </h1>
              <div className="absolute -bottom-1 left-0 w-36 h-0.5 bg-gradient-to-r from-primary-container via-secondary to-transparent" />
            </div>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant uppercase tracking-wider mt-2">
              Slice 3D flying fruit with your hand in front of your webcam.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="font-label-sm text-[10px] text-outline uppercase">
                Vision Engine
              </div>
              <div className="font-headline-sm text-[14px] text-secondary font-bold">
                READY TO ENGAGE
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-primary-container text-[22px]">
                precision_manufacturing
              </span>
            </div>
          </div>
        </div>

        {/* Gesture Guide Cards */}
        <div>
          <div className="font-label-sm text-[11px] text-outline uppercase tracking-wider mb-2">
            Available Hand Combat Gestures
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-surface-container/70 border border-outline-variant/40 flex items-center gap-3">
              <div className="text-2xl">☝️</div>
              <div>
                <div className="font-label-sm text-[12px] font-bold text-primary">
                  Laser Dagger
                </div>
                <div className="font-body-sm text-[11px] text-on-surface-variant">
                  Point index finger to swipe & slice
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container/70 border border-primary-container/30 flex items-center gap-3 shadow-[0_0_12px_rgba(0,240,255,0.08)]">
              <div className="text-2xl">✋</div>
              <div>
                <div className="font-label-sm text-[12px] font-bold text-primary-container">
                  Cyber Katana
                </div>
                <div className="font-body-sm text-[11px] text-on-surface-variant">
                  Open palm karate chop swipe
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container/70 border border-outline-variant/40 flex items-center gap-3">
              <div className="text-2xl">✊</div>
              <div>
                <div className="font-label-sm text-[12px] font-bold text-secondary">
                  Plasma Sabre
                </div>
                <div className="font-body-sm text-[11px] text-on-surface-variant">
                  Fist grip with extended neon blade
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error message (if any) */}
        {status === "error" && errorMsg && (
          <div className="p-3.5 rounded-xl bg-error-container/30 border border-error/50 text-error font-body-sm text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* CTA Launch Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-outline flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              check_circle
            </span>
            <span>Camera prompt will appear. Click Allow to begin.</span>
          </div>

          <button
            type="button"
            onClick={onStart}
            disabled={status === "loading"}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-headline-sm text-[15px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary-container via-secondary to-primary text-surface-container-lowest shadow-[0_0_24px_rgba(0,240,255,0.5)] hover:shadow-[0_0_36px_rgba(0,240,255,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">
              {status === "loading" ? "hourglass_top" : "play_arrow"}
            </span>
            <span>
              {status === "loading"
                ? "SYNCHRONIZING CAMERA..."
                : "START BLADE ENGINE"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
