import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareCardButton } from "@/components/ShareCardButton";
import { ensureGuestUser } from "@/lib/auth";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CardDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await ensureGuestUser();
  const card = await store.getCard(id, user.id);
  if (!card) notFound();

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(card.estimatedValue);

  return (
    <section className="card-detail-page">
      <p className="muted">
        <Link href="/garage">← Garage</Link>
      </p>
      <div className={`detail-hero rarity-glow-${card.rarity.toLowerCase()}`}>
        <div className="detail-image trading-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.imagePath || "/file.svg"} alt={`${card.make} ${card.model}`} />
          <span className={`badge rarity-${card.rarity.toLowerCase()}`}>{card.rarity}</span>
        </div>
        <div className="panel detail-panel">
          <h1 className="section-title detail-title">
            {card.make} {card.model}
          </h1>
          <p className="section-lead">
            {card.yearLabel} · {card.bodyStyle}
          </p>
          <p>{card.notes}</p>
          <dl className="stats">
            <div className="stat">
              <dt>Horsepower</dt>
              <dd>{card.horsepower} hp</dd>
            </div>
            <div className="stat">
              <dt>Top speed</dt>
              <dd>{card.topSpeed} km/h</dd>
            </div>
            <div className="stat">
              <dt>Est. value</dt>
              <dd>{money}</dd>
            </div>
            <div className="stat">
              <dt>Origin</dt>
              <dd>{card.origin}</dd>
            </div>
          </dl>
          {card.lat != null && card.lng != null ? (
            <p className="muted spot-line">
              Spot: {card.lat.toFixed(4)}, {card.lng.toFixed(4)} —{" "}
              <Link href="/map">view on map</Link>
            </p>
          ) : (
            <p className="muted spot-line">No GPS on this spot.</p>
          )}
          <div className="detail-actions">
            <ShareCardButton
              make={card.make}
              model={card.model}
              rarity={card.rarity}
              id={card.id}
            />
            <Link className="btn btn-ghost" href="/scan">
              Spot another
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}