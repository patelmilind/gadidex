import { SpotMap } from "@/components/SpotMap";
import { ensureGuestUser } from "@/lib/auth";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const user = await ensureGuestUser();
  const cards = await store.listMappedCards(user.id);

  return (
    <section className="map-page">
      <h1 className="section-title">Map</h1>
      <p className="section-lead">
        Every GPS-tagged spot. Hunt new streets, fill the map, flex the range.
      </p>
      <div className="map-wrap">
        <SpotMap
          spots={cards.map((c) => ({
            id: c.id,
            make: c.make,
            model: c.model,
            lat: c.lat as number,
            lng: c.lng as number,
          }))}
        />
      </div>
    </section>
  );
}