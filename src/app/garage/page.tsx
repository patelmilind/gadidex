import Link from "next/link";
import { ensureGuestUser } from "@/lib/auth";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function GaragePage() {
  const user = await ensureGuestUser();
  const cards = await store.listCards(user.id);

  return (
    <section className="garage-page">
      <h1 className="section-title">Garage</h1>
      <p className="section-lead">
        {cards.length} card{cards.length === 1 ? "" : "s"} collected. Flex the
        rarest — share from any card.
      </p>
      {cards.length === 0 ? (
        <div className="empty">
          Empty bay. <Link href="/scan">Scan your first car</Link>.
        </div>
      ) : (
        <div className="grid-cards trading-grid">
          {cards.map((card) => (
            <Link key={card.id} href={`/garage/${card.id}`} className="spot-card trading-card">
              <div className="trading-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.imagePath || "/file.svg"} alt={`${card.make} ${card.model}`} />
                <span className={`badge rarity-${card.rarity.toLowerCase()}`}>{card.rarity}</span>
              </div>
              <div className="meta">
                <h3>
                  {card.make} {card.model}
                </h3>
                <p className="sub">{card.yearLabel}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}