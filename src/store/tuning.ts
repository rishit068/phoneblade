import { create } from "zustand";
import { DEFAULT_TUNING, type SwingTuning } from "../swing/types";

interface TuningState extends SwingTuning {
  set: <K extends keyof SwingTuning>(key: K, value: SwingTuning[K]) => void;
  reset: () => void;
}

const STORAGE_KEY = "phoneblade.tuning.v2";

function loadInitial(): SwingTuning {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TUNING;
    const parsed = JSON.parse(raw) as Partial<SwingTuning>;
    return { ...DEFAULT_TUNING, ...parsed };
  } catch {
    return DEFAULT_TUNING;
  }
}

function persist(state: SwingTuning) {
  try {
    const { ...rest } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export const useTuning = create<TuningState>((setState, getState) => ({
  ...loadInitial(),
  set: (key, value) => {
    setState({ [key]: value } as Partial<TuningState>);
    const { set: _set, reset: _reset, ...rest } = getState();
    persist(rest as SwingTuning);
  },
  reset: () => {
    setState({ ...DEFAULT_TUNING });
    persist(DEFAULT_TUNING);
  },
}));
