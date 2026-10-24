"use client";

import { useEffect, useRef, useState } from "react";
import { CardMint, type MintCard } from "@/components/CardMint";
import { awardScan } from "@/lib/progress";

type Phase =
  | "starting"
  | "blocked"
  | "ready"
  | "captured"
  | "submitting"
  | "minted";

export function LiveScan() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("starting");
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("Opening camera…");
  const [statusLine, setStatusLine] = useState("Starting…");
  const [mint, setMint] = useState<{
    card: MintCard;
    xpGained: number;
    streak: number;
  } | null>(null);

  useEffect(() => {
    void startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setPhase("starting");
    setError(null);
    setStatusLine("Opening camera…");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setBlockReason("Camera API unavailable in this browser.");
        setPhase("blocked");
        return;
      }

      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 },
          );
        });
        if (position) {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      }

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
      setStatusLine("Live camera");
      setHint("Point at a car, then capture.");
    } catch (err) {
      setBlockReason(
        err instanceof Error
          ? err.message
          : "Could not open the camera. Allow camera permission and try again.",
      );
      setPhase("blocked");
    }
  }

  // Refresh status once coords resolve after camera start
  useEffect(() => {
    if (phase === "ready") {
      setStatusLine(coords ? "Live + GPS" : "Live camera");
    }
  }, [coords, phase]);

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
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
    setStatusLine("Ready to mint");
    setHint("Looks good? Mint the card, or retake.");
  }

  async function submit() {
    if (!blob) return;
    setPhase("submitting");
    setError(null);
    setStatusLine("Recognizing…");
    try {
      await fetch("/api/auth/guest", { method: "POST" });
      const body = new FormData();
      body.set("image", blob, "live-capture.jpg");
      if (coords) {
        body.set("lat", String(coords.lat));
        body.set("lng", String(coords.lng));
      }
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
      setPhase("ready");
      setBlob(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setHint("Try capturing again.");
      setStatusLine(coords ? "Live + GPS" : "Live camera");
    }
  }

  function resetAfterMint() {
    setMint(null);
    setBlob(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    setPhase("ready");
    setStatusLine(coords ? "Live + GPS" : "Live camera");
    setHint("Hunt the next car.");
  }

  if (phase === "blocked") {
    return (
      <div className="panel scan-blocked">
        <p className="error">{blockReason}</p>
        <button className="btn btn-primary" type="button" onClick={() => void startCamera()}>
          Try again
        </button>
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
            <img className="viewfinder-freeze" src={preview} alt="Capture preview" />
          ) : null}
          <div className="viewfinder-frame" aria-hidden />
          <p className="viewfinder-hint">{hint}</p>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="scan-actions">
          {phase === "starting" ? (
            <p className="muted">Opening camera…</p>
          ) : null}

          {phase === "ready" ? (
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
                  setPhase("ready");
                  setStatusLine(coords ? "Live + GPS" : "Live camera");
                  setHint("Point at a car, then capture.");
                }}
              >
                Retake
              </button>
            </>
          ) : null}

          {phase === "submitting" ? (
            <p className="muted scan-loading">Recognizing & minting…</p>
          ) : null}
        </div>
      </div>

      {mint ? (
        <CardMint
          card={mint.card}
          xpGained={mint.xpGained}
          streak={mint.streak}
          onClose={resetAfterMint}
        />
      ) : null}
    </>
  );
}