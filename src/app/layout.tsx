import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { HudBar } from "@/components/HudBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gadidex — Spot. Collect. Rank.",
  description:
    "Turn cars you spot into collectible cards. Scan, garage, and map your finds with Gadidex.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <HudBar />
          <main className="main">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}