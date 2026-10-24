"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadProgress, type Progress } from "@/lib/progress";

export function HudBar() {
  const [progress, setProgress] = useState<Progress>({
    xp: 0,
    streak: 0,
    lastScanDay: null,
    scans: 0,
  });

  useEffect(() => {
    setProgress(loadProgress());
    function onUpdate(event: Event) {
      const detail = (event as CustomEvent<Progress>).detail;
      if (detail) setProgress(detail);
      else setProgress(loadProgress());
    }
    window.addEventListener("gadidex-progress", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("gadidex-progress", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  return (
    <header className="hud-bar">
      <Link href="/" className="brand hud-brand">
        GADI<span>DEX</span>
      </Link>
      <div className="hud-chips">
        {progress.streak > 0 ? (
          <span className="hud-chip streak" title="Daily streak">
            🔥 {progress.streak}d
          </span>
        ) : null}
        <span className="hud-chip xp" title="Spotter XP">
          {progress.xp} XP
        </span>
      </div>
    </header>
  );
}