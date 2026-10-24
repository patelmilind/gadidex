const KEY = "gadidex-progress-v1";

export type Progress = {
  xp: number;
  streak: number;
  lastScanDay: string | null;
  scans: number;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function rarityXp(rarity: string): number {
  switch (rarity.toLowerCase()) {
    case "legendary":
      return 120;
    case "epic":
      return 80;
    case "rare":
      return 60;
    case "uncommon":
      return 40;
    default:
      return 20;
  }
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") {
    return { xp: 0, streak: 0, lastScanDay: null, scans: 0 };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { xp: 0, streak: 0, lastScanDay: null, scans: 0 };
    const parsed = JSON.parse(raw) as Progress;
    return {
      xp: Number(parsed.xp) || 0,
      streak: Number(parsed.streak) || 0,
      lastScanDay: parsed.lastScanDay ?? null,
      scans: Number(parsed.scans) || 0,
    };
  } catch {
    return { xp: 0, streak: 0, lastScanDay: null, scans: 0 };
  }
}

export function saveProgress(next: Progress) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("gadidex-progress", { detail: next }));
}

export function awardScan(rarity: string): {
  progress: Progress;
  gained: number;
  streakGrew: boolean;
} {
  const prev = loadProgress();
  const gained = rarityXp(rarity);
  const today = todayKey();
  let streak = prev.streak;
  let streakGrew = false;
  if (prev.lastScanDay === today) {
    // same day — keep streak
  } else if (prev.lastScanDay === yesterdayKey()) {
    streak = Math.max(1, prev.streak) + 1;
    streakGrew = true;
  } else {
    streak = 1;
    streakGrew = prev.streak !== 1;
  }
  const progress: Progress = {
    xp: prev.xp + gained,
    streak,
    lastScanDay: today,
    scans: prev.scans + 1,
  };
  saveProgress(progress);
  return { progress, gained, streakGrew };
}