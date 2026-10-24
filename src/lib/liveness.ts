import { randomUUID } from "crypto";

export type ScanSession = {
  id: string;
  createdAt: number;
  expiresAt: number;
  live: boolean;
  consumed: boolean;
  peakAccel: number;
  frameDelta: number;
};

const SESSION_TTL_MS = 3 * 60 * 1000;
const MIN_PEAK_ACCEL = 1.2;
const MIN_FRAME_DELTA = 6;

type GlobalSessions = {
  __gadidexScanSessions?: Map<string, ScanSession>;
};

function sessions(): Map<string, ScanSession> {
  const g = globalThis as typeof globalThis & GlobalSessions;
  if (!g.__gadidexScanSessions) {
    g.__gadidexScanSessions = new Map();
  }
  return g.__gadidexScanSessions;
}

function prune(map: Map<string, ScanSession>) {
  const now = Date.now();
  for (const [id, session] of map) {
    if (session.expiresAt < now || session.consumed) {
      map.delete(id);
    }
  }
}

export function createScanSession(): ScanSession {
  const map = sessions();
  prune(map);
  const now = Date.now();
  const session: ScanSession = {
    id: randomUUID(),
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    live: false,
    consumed: false,
    peakAccel: 0,
    frameDelta: 0,
  };
  map.set(session.id, session);
  return session;
}

export function markSessionLive(input: {
  sessionId: string;
  peakAccel: number;
  frameDelta: number;
}): { ok: true; session: ScanSession } | { ok: false; error: string } {
  const map = sessions();
  prune(map);
  const session = map.get(input.sessionId);
  if (!session) {
    return { ok: false, error: "Scan session expired. Start again." };
  }
  if (session.consumed) {
    return { ok: false, error: "Scan session already used." };
  }
  if (!Number.isFinite(input.peakAccel) || !Number.isFinite(input.frameDelta)) {
    return { ok: false, error: "Invalid liveness metrics." };
  }
  if (input.peakAccel < MIN_PEAK_ACCEL) {
    return {
      ok: false,
      error: "Tilt not detected. Hold the phone and tilt left, then right.",
    };
  }
  if (input.frameDelta < MIN_FRAME_DELTA) {
    return {
      ok: false,
      error: "Camera view barely changed. Point at a real car outdoors and tilt.",
    };
  }
  session.live = true;
  session.peakAccel = input.peakAccel;
  session.frameDelta = input.frameDelta;
  return { ok: true, session };
}

export function consumeLiveSession(
  sessionId: string,
): { ok: true } | { ok: false; error: string } {
  const map = sessions();
  prune(map);
  const session = map.get(sessionId);
  if (!session) {
    return { ok: false, error: "Scan session expired. Start again." };
  }
  if (!session.live) {
    return { ok: false, error: "Complete the tilt check before capturing." };
  }
  if (session.consumed) {
    return { ok: false, error: "Scan session already used." };
  }
  session.consumed = true;
  map.delete(sessionId);
  return { ok: true };
}
