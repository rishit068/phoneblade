interface VictoryModalProps {
  score: number;
  maxCombo: number;
  totalSliced: number;
  onPlayAgain: () => void;
  onOpenArmory?: () => void;
}

export function VictoryModal({
  score,
  maxCombo,
  totalSliced,
  onPlayAgain,
  onOpenArmory,
}: VictoryModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-surface-container-lowest/85 backdrop-blur-xl">
      {/* Outer Glow Field */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary-container/20 via-secondary-fixed/30 to-primary-container/20 rounded-full blur-2xl opacity-75 animate-pulse pointer-events-none" />

      {/* Modal Card Body */}
      <div className="relative w-full max-w-2xl bg-surface-container-lowest/95 backdrop-blur-2xl rounded-2xl border border-primary-container/30 shadow-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-hidden">
        {/* Corner Sci-Fi L-Brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none p-1.5">
          <div className="w-full h-full border-t-2 border-l-2 border-primary-container" />
        </div>
        <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none p-1.5">
          <div className="w-full h-full border-t-2 border-r-2 border-primary-container" />
        </div>
        <div className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none p-1.5">
          <div className="w-full h-full border-b-2 border-l-2 border-secondary" />
        </div>
        <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none p-1.5">
          <div className="w-full h-full border-b-2 border-r-2 border-secondary" />
        </div>

        {/* Top Telemetry Ribbon */}
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-outline-variant/30">
          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
            <span className="font-label-sm text-[10px] text-secondary font-bold tracking-widest uppercase">
              [ MATCH DEBRIEF // NEURAL SYNAPSE COMPLETED ]
            </span>
          </div>
          <div className="flex items-center gap-1 font-label-sm text-[10px] text-outline">
            <span className="material-symbols-outlined text-[13px] text-primary">
              verified
            </span>
            <span className="tracking-widest">RECORD_SYNCED</span>
          </div>
        </div>

        {/* Title Area & Trophy */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-primary-fixed-dim font-label-sm text-[11px] uppercase tracking-widest">
              <span className="material-symbols-outlined text-[15px]">
                stars
              </span>
              <span>SYNAPTIC BENCHMARK EXCEEDED</span>
            </div>
            <h1 className="font-display-hero text-4xl sm:text-5xl font-extrabold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-fixed to-secondary mt-1">
              VICTORY
            </h1>
            <p className="font-headline-sm text-sm text-secondary uppercase tracking-widest flex items-center gap-1.5 mt-1">
              <span>// MATCH COMPLETED!</span>
              <span className="material-symbols-outlined text-[18px]">
                local_fire_department
              </span>
            </p>
          </div>

          <div className="flex sm:flex-col items-center justify-center p-3 bg-surface-container-high rounded-xl text-center min-w-[120px] border border-outline-variant/30">
            <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-primary-container text-[24px]">
                military_tech
              </span>
            </div>
            <span className="font-label-sm text-[11px] text-primary font-bold uppercase tracking-wider mt-1">
              ARENA APEX
            </span>
            <span className="font-label-sm text-[10px] text-outline">
              TIER-0 RANK
            </span>
          </div>
        </div>

        {/* Final Score Tactical Readout */}
        <div className="relative bg-surface-container-low p-5 sm:p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-outline-variant/40 overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary-container/10 to-transparent pointer-events-none" />
          <div className="flex flex-col">
            <span className="font-label-md text-xs uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary-container">
                speed
              </span>
              SYNAPSE SCORE AGGREGATE
            </span>
            <span className="font-display-hero text-4xl sm:text-5xl font-black text-primary drop-shadow-[0_0_16px_rgba(0,240,255,0.6)] mt-1">
              {score.toLocaleString()} <span className="text-xl text-primary-container">PTS</span>
            </span>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">
                Max Combo
              </span>
              <span className="font-headline-md text-xl font-bold text-laser-yellow text-[#ffd600]">
                x{maxCombo}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">
                Sliced
              </span>
              <span className="font-headline-md text-xl font-bold text-secondary">
                {totalSliced}
              </span>
            </div>
          </div>
        </div>

        {/* Fruit Breakdown Pills */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-surface-container/60 rounded-xl border border-outline-variant/30 flex items-center gap-2">
            <span className="text-xl">🍎</span>
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] text-outline uppercase">
                Apples
              </span>
              <span className="font-label-md text-xs font-bold text-primary">
                {Math.floor(totalSliced * 0.45)}
              </span>
            </div>
          </div>
          <div className="p-3 bg-surface-container/60 rounded-xl border border-outline-variant/30 flex items-center gap-2">
            <span className="text-xl">🍊</span>
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] text-outline uppercase">
                Oranges
              </span>
              <span className="font-label-md text-xs font-bold text-primary">
                {Math.floor(totalSliced * 0.35)}
              </span>
            </div>
          </div>
          <div className="p-3 bg-surface-container/60 rounded-xl border border-outline-variant/30 flex items-center gap-2">
            <span className="text-xl">🍉</span>
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] text-outline uppercase">
                Melons
              </span>
              <span className="font-label-md text-xs font-bold text-primary">
                {Math.ceil(totalSliced * 0.2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-xl font-headline-sm text-sm font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary-container via-secondary to-primary text-surface-container-lowest shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_30px_rgba(0,240,255,0.7)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">replay</span>
            <span>PLAY AGAIN</span>
          </button>
          {onOpenArmory && (
            <button
              type="button"
              onClick={onOpenArmory}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl font-label-md text-xs font-bold uppercase tracking-wider bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">swords</span>
              <span>BLADE ARMORY</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
