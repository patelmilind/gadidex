import Link from "next/link";

export default function HomePage() {
  return (
    <section className="hero home-viral">
      <p className="home-kicker">Street spotting · Collectible cards</p>
      <h1 className="hero-brand">
        GADI<span>DEX</span>
      </h1>
      <p>
        Point your phone at a real car. Mint a card. Flex the rarity. Build a
        garage of machines you actually saw.
      </p>
      <div className="cta-row">
        <Link className="btn btn-primary btn-pulse" href="/scan">
          Start spotting
        </Link>
        <Link className="btn btn-ghost" href="/garage">
          Open garage
        </Link>
      </div>
      <ul className="home-hooks">
        <li>Live camera only — no gallery cheats</li>
        <li>Rarity bursts + XP streaks</li>
        <li>Share cards that look like the win</li>
      </ul>
    </section>
  );
}