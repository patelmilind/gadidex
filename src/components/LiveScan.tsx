"use client";

import { useEffect, useRef, useState } from "react";
import { CardMint, type MintCard } from "@/components/CardMint";
import { awardScan } from "@/lib/progress";

type Phase =
  | "checking"
  | "blocked"
  | "need_motion_permission"
  | "starting"
  | "ready"
  | "tilting"
  | "live"
  | "captured"
  | "submitting"
  | "minted";

function isPhoneLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const touch = navigator.maxTouchPoints > 1;
  return mobileUa || (touch && window.innerWidth < 1024);
}

function supportsMotion(): boolean {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

async function requestMotionPermission(): Promise<boolean> {
  type MotionRequest = {
    requestPermission?: () => Promise<"granted" | "denied" | "default">;
  };
  const DEM = DeviceMotionEvent as unknown as MotionRequest;
  if (typeof DEM.requestPermission !== "function") return true;
  const result = await DEM.requestPermission();
  return result === "granted";
}

function sampleFrame(video: HTMLVideoElement): Float32Array | null {
  const w = 64;
  const h = 48;
  if (video.videoWidth < 16 || video.videoHeight < 16) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

function frameDelta(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}

export function LiveScan() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peakAccelRef = useRef(0);
  const maxFrameDeltaRef = useRef(0);
  const baselineFrameRef = useRef<Float32Array | null>(null);
  const sawLeftRef = useRef(false);
  const sawRightRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("checking");
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("Starting live camera…");
  const [statusLine, setStatusLine] = useState("Waiting…");
  const [mint, setMint] = useState<{
    card: MintCard;
    xpGained: number;
    streak: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startPipeline() {
    setPhase("starting");
    setError(null);
    setStatusLine("Locking GPS + camera…");
    try {
      const motionOk = await requestMotionPermission();
      if (!motionOk) {
        setBlockReason("Motion permission denied. Allow motion to prove a live tilt.");
        setPhase("blocked");
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 0,
        });
      }).catch(() => null);
      if (!position) {
        setBlockReason("GPS required. Enable location and try again outdoors.");
        setPhase("blocked");
        return;
      }
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      const sessionRes = await fetch("/api/scan/session", { method: "POST" });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) {
        throw new Error(sessionData.error || "Could not start scan session");
      }
      setSessionId(sessionData.sessionId);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview missing");
      video.srcObject = stream;
      await video.play();

      setPhase("ready");
      setStatusLine("Live · GPS locked");
      setHint("Frame a real car, then start the tilt check.");
    } catch (err) {
      setBlockReason(
        err instanceof Error
          ? err.message
          : "Could not start live scan. Check camera and location permissions.",
      );
      setPhase("blocked");
    }
  }

  useEffect(() => {
    async function boot() {
      if (!isPhoneLike()) {
        setBlockReason(
          "Scan needs a phone or tablet with a rear camera, GPS, and motion sensors.",
        );
        setPhase("blocked");
        return;
      }
      if (!supportsMotion()) {
        setBlockReason("This browser has no motion sensors. Use Safari/Chrome on your phone.");
        setPhase("blocked");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setBlockReason("Camera API unavailable in this browser.");
        setPhase("blocked");
        return;
      }
      if (!navigator.geolocation) {
        setBlockReason("GPS is required. Enable location services.");
        setPhase("blocked");
        return;
      }

      type MotionRequest = {
        requestPermission?: () => Promise<"granted" | "denied" | "default">;
      };
      const needsTap =
        typeof (DeviceMotionEvent as unknown as MotionRequest).requestPermission ===
        "function";
      if (needsTap) {
        setPhase("need_motion_permission");
        setHint("Tap to allow motion sensors, then we open the rear camera.");
        setStatusLine("Needs permission");
        return;
      }

      await startPipeline();
    }
    void boot();
  }, []);

  useEffect(() => {
    if (phase !== "tilting" && phase !== "ready" && phase !== "live") return;

    function onMotion(event: DeviceMotionEvent) {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const mag = Math.sqrt(
        (acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2,
      );
      const delta = Math.abs(mag - 9.8);
      if (delta > peakAccelRef.current) peakAccelRef.current = delta;
      const x = acc.x ?? 0;
      if (x < -2.5) sawLeftRef.current = true;
      if (x > 2.5) sawRightRef.current = true;
    }

    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [phase]);

  useEffect(() => {
    if (phase !== "tilting") return;
    const video = videoRef.current;
    if (!video) return;

    const id = window.setInterval(() => {
      const frame = sampleFrame(video);
      if (!frame) return;
      if (!baselineFrameRef.current) {
        baselineFrameRef.current = frame;
        return;
      }
      const d = frameDelta(baselineFrameRef.current, frame);
      if (d > maxFrameDeltaRef.current) maxFrameDeltaRef.current = d;
    }, 200);

    return () => window.clearInterval(id);
  }, [phase]);

  async function beginTilt() {
    setError(null);
    peakAccelRef.current = 0;
    maxFrameDeltaRef.current = 0;
    baselineFrameRef.current = null;
    sawLeftRef.current = false;
    sawRightRef.current = false;
    setPhase("tilting");
    setStatusLine("Liveness · tilt");
    setHint("Tilt the phone left, then right — keep the car in view.");
  }

  async function finishTilt() {
    setError(null);
    if (!sessionId) {
      setError("Missing scan session.");
      return;
    }
    if (!sawLeftRef.current || !sawRightRef.current) {
      setError("Tilt left and right so sensors register both directions.");
      return;
    }
    const res = await fetch("/api/scan/liveness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        peakAccel: peakAccelRef.current,
        frameDelta: maxFrameDeltaRef.current,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Liveness check failed");
      setPhase("ready");
      setStatusLine("Live · GPS locked");
      setHint("Try the tilt again with a clearer view of the car.");
      return;
    }
    setPhase("live");
    setStatusLine("Ready to capture");
    setHint("Liveness passed. Capture the car.");
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !sessionId || !coords) return;
    setError(null);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Could not capture frame.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const nextBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!nextBlob) {
      setError("Could not encode capture.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setBlob(nextBlob);
    setPreview(URL.createObjectURL(nextBlob));
    setPhase("captured");
    setStatusLine("Frozen frame");
    setHint("Mint it, or retake.");
  }

  async function submit() {
    if (!blob || !sessionId || !coords) return;
    setPhase("submitting");
    setError(null);
    setStatusLine("Recognizing…");
    try {
      await fetch("/api/auth/guest", { method: "POST" });
      const body = new FormData();
      body.set("image", blob, "live-capture.jpg");
      body.set("sessionId", sessionId);
      body.set("lat", String(coords.lat));
      body.set("lng", String(coords.lng));
      const res = await fetch("/api/recognize", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Recognize failed");
      }
      const reward = awardScan(String(data.card.rarity ?? "Common"));
      setMint({
        card: data.card as MintCard,
        xpGained: reward.gained,
        streak: reward.progress.streak,
      });
      setPhase("minted");
      setStatusLine("Card minted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setPhase("live");
      setHint("Capture again from the live camera.");
      setStatusLine("Retry capture");
      try {
        const sessionRes = await fetch("/api/scan/session", { method: "POST" });
        const sessionData = await sessionRes.json();
        if (sessionRes.ok) {
          setSessionId(sessionData.sessionId);
          setPhase("ready");
          setBlob(null);
          if (preview) URL.revokeObjectURL(preview);
          setPreview(null);
          setHint("Session refreshed. Run the tilt check again, then capture.");
          setStatusLine("Live · GPS locked");
        }
      } catch {
        /* ignore */
      }
    }
  }

  async function resetAfterMint() {
    setMint(null);
    setBlob(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    try {
      const sessionRes = await fetch("/api/scan/session", { method: "POST" });
      const sessionData = await sessionRes.json();
      if (sessionRes.ok) setSessionId(sessionData.sessionId);
    } catch {
      /* ignore */
    }
    setPhase("ready");
    setStatusLine("Live · GPS locked");
    setHint("Hunt the next car.");
  }

  if (phase === "blocked") {
    return (
      <div className="panel scan-blocked">
        <p className="error">{blockReason}</p>
        <p className="muted">
          Gallery upload is off. Spot a real car on the street with your phone.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="scan-hud panel">
        <div className="scan-status-row">
          <span className="scan-live-dot" aria-hidden />
          <span>{statusLine}</span>
        </div>

        <div className="viewfinder viewfinder-inset">
          <video
            ref={videoRef}
            className="viewfinder-video"
            playsInline
            muted
            autoPlay
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="viewfinder-freeze" src={preview} alt="Live capture" />
          ) : null}
          <div className="viewfinder-frame" aria-hidden />
          <p className="viewfinder-hint">{hint}</p>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="scan-actions">
          {phase === "need_motion_permission" || phase === "checking" ? (
            <button className="btn btn-primary btn-pulse" type="button" onClick={() => void startPipeline()}>
              Allow sensors & open camera
            </button>
          ) : null}

          {phase === "starting" ? (
            <p className="muted">Requesting camera, GPS, and scan session…</p>
          ) : null}

          {phase === "ready" ? (
            <button className="btn btn-primary" type="button" onClick={() => void beginTilt()}>
              Start tilt check
            </button>
          ) : null}

          {phase === "tilting" ? (
            <>
              <button className="btn btn-primary" type="button" onClick={() => void finishTilt()}>
                I&apos;ve tilted — verify
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => void beginTilt()}>
                Reset tilt
              </button>
            </>
          ) : null}

          {phase === "live" ? (
            <button className="btn btn-primary btn-shutter" type="button" onClick={() => void capture()}>
              Capture
            </button>
          ) : null}

          {phase === "captured" ? (
            <>
              <button className="btn btn-primary btn-pulse" type="button" onClick={() => void submit()}>
                Mint card
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(null);
                  setBlob(null);
                  setPhase("live");
                  setStatusLine("Ready to capture");
                  setHint("Capture again from the live stream.");
                }}
              >
                Retake
              </button>
            </>
          ) : null}

          {phase === "submitting" ? (
            <p className="muted scan-loading">Checking street photo & minting…</p>
          ) : null}
        </div>
      </div>

      {mint ? (
        <CardMint
          card={mint.card}
          xpGained={mint.xpGained}
          streak={mint.streak}
          onClose={() => void resetAfterMint()}
        />
      ) : null}
    </>
  );
}