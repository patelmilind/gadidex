"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type MintCard = {
  id: string;
  make: string;
  model: string;
  yearLabel: string;
  bodyStyle: string;
  horsepower: number;
  topSpeed: number;
  estimatedValue: number;
  rarity: string;
  origin: string;
  notes: string;
  imagePath: string;
};

type Props = {
  card: MintCard;
  xpGained: number;
  streak: number;
  onClose: () => void;
};

export function CardMint({ card, xpGained, streak, onClose }: Props) {
  const [stage, setStage] = useState<"flip" | "burst">("flip");
  const [faceUp, setFaceUp] = useState(false);

  useEffect(() => {
    const flip = window.setTimeout(() => setFaceUp(true), 80);
    const burst = window.setTimeout(() => setStage("burst"), 950);
    return () => {
      window.clearTimeout(flip);
      window.clearTimeout(burst);
    };
  }, []);

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(card.estimatedValue);

  async function share() {
    const title = `${card.make} ${card.model} — ${card.rarity} on Gadidex`;
    const text = `Just minted a ${card.rarity} ${card.make} ${card.model} (+${xpGained} XP). Spot cars IRL on Gadidex.`;
    const url = typeof window !== "undefined" ? window.location.origin + `/garage/${card.id}` : "";
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      /* user cancelled */
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      alert("Share text copied — paste it anywhere.");
    } catch {
      alert(text);
    }
  }

  return (
    <div className="mint-overlay" role="dialog" aria-modal="true" aria-label="Card minted">
      <div className={`mint-burst ${stage === "burst" ? "is-on" : ""}`} />
      <div className="mint-stage">
        {stage === "burst" ? (
          <p className="mint-banner">NEW {card.rarity.toUpperCase()}</p>
        ) : (
          <p className="mint-banner muted-banner">Minting…</p>
        )}

        <div className={`mint-card ${faceUp ? "is-revealed" : "is-flipping"}`}>
          <div className="mint-card-inner">
            <div className="mint-face mint-back" />
            <div className="mint-face mint-front">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.imagePath || "/file.svg"} alt="" />
              <span className={`badge rarity-${card.rarity.toLowerCase()}`}>{card.rarity}</span>
              <h2>
                {card.make} {card.model}
              </h2>
              <p className="mint-sub">
                {card.yearLabel} · {card.bodyStyle}
              </p>
              <div className="mint-stats">
                <span>{card.horsepower} hp</span>
                <span>{money}</span>
                <span>{card.origin}</span>
              </div>
            </div>
          </div>
        </div>

        {stage === "burst" ? (
          <div className="mint-rewards">
            <span className="mint-xp">+{xpGained} XP</span>
            {streak > 0 ? <span className="mint-streak">🔥 {streak} day streak</span> : null}
          </div>
        ) : null}

        <div className="mint-actions">
          <button className="btn btn-primary" type="button" onClick={() => void share()}>
            Share card
          </button>
          <Link className="btn btn-ghost" href={`/garage/${card.id}`} onClick={onClose}>
            Open card
          </Link>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Scan again
          </button>
        </div>
      </div>
    </div>
  );
}