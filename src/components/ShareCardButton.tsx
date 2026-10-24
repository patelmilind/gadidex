"use client";

type Props = {
  id: string;
  make: string;
  model: string;
  rarity: string;
};

export function ShareCardButton({ id, make, model, rarity }: Props) {
  async function share() {
    const title = `${make} ${model} — ${rarity} on Gadidex`;
    const text = `Check my ${rarity} ${make} ${model} on Gadidex.`;
    const url = `${window.location.origin}/garage/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      alert("Link copied.");
    } catch {
      alert(url);
    }
  }

  return (
    <button className="btn btn-primary" type="button" onClick={() => void share()}>
      Share card
    </button>
  );
}