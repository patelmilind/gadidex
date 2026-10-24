"use client";

import { LiveScan } from "@/components/LiveScan";

export default function ScanPage() {
  return (
    <section className="scan-page">
      <div className="scan-heading">
        <h1 className="section-title">Scan</h1>
        <p className="section-lead">
          Open the camera, capture a car, mint the card.
        </p>
      </div>
      <LiveScan />
    </section>
  );
}