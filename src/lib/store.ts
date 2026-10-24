import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type User = {
  id: string;
  guestToken: string;
  googleSub: string | null;
  createdAt: string;
};

export type Card = {
  id: string;
  userId: string;
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
  lat: number | null;
  lng: number | null;
  createdAt: string;
};

export type CatalogCar = {
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
  keywords: string;
};

type DbShape = {
  users: User[];
  cards: Card[];
  catalog: CatalogCar[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "gadidex.json");

const DEFAULT_CATALOG: Omit<CatalogCar, "id">[] = [
  {
    make: "Nissan",
    model: "GT-R R35",
    yearLabel: "2009-2024",
    bodyStyle: "Coupe",
    horsepower: 565,
    topSpeed: 315,
    estimatedValue: 95000,
    rarity: "Epic",
    origin: "Japan",
    notes: "Godzilla — twin-turbo VR38, AWD legend.",
    keywords: "gtr,nissan,r35,godzilla",
  },
  {
    make: "Porsche",
    model: "911 GT3 RS",
    yearLabel: "2022-2025",
    bodyStyle: "Coupe",
    horsepower: 518,
    topSpeed: 296,
    estimatedValue: 280000,
    rarity: "Legendary",
    origin: "Germany",
    notes: "Track weapon with swan-neck wing drama.",
    keywords: "porsche,gt3,911,rs",
  },
  {
    make: "Ford",
    model: "Mustang Shelby GT350",
    yearLabel: "2015-2020",
    bodyStyle: "Coupe",
    horsepower: 526,
    topSpeed: 280,
    estimatedValue: 72000,
    rarity: "Rare",
    origin: "USA",
    notes: "Flat-plane V8 howl for the street.",
    keywords: "mustang,shelby,ford,gt350",
  },
  {
    make: "Ferrari",
    model: "488 GTB",
    yearLabel: "2015-2019",
    bodyStyle: "Coupe",
    horsepower: 661,
    topSpeed: 330,
    estimatedValue: 240000,
    rarity: "Legendary",
    origin: "Italy",
    notes: "Twin-turbo V8 mid-engine Italian theater.",
    keywords: "ferrari,488,gtb",
  },
  {
    make: "Toyota",
    model: "Supra MK4",
    yearLabel: "1993-2002",
    bodyStyle: "Coupe",
    horsepower: 320,
    topSpeed: 250,
    estimatedValue: 85000,
    rarity: "Epic",
    origin: "Japan",
    notes: "2JZ legend — tuner royalty.",
    keywords: "supra,toyota,mk4,2jz",
  },
  {
    make: "BMW",
    model: "M3 E30",
    yearLabel: "1986-1991",
    bodyStyle: "Coupe",
    horsepower: 215,
    topSpeed: 235,
    estimatedValue: 110000,
    rarity: "Epic",
    origin: "Germany",
    notes: "Homologation hero with perfect proportions.",
    keywords: "bmw,m3,e30",
  },
  {
    make: "Lamborghini",
    model: "Huracán",
    yearLabel: "2014-2024",
    bodyStyle: "Coupe",
    horsepower: 610,
    topSpeed: 325,
    estimatedValue: 220000,
    rarity: "Legendary",
    origin: "Italy",
    notes: "V10 soundtrack, sharp edges, parking-lot chaos.",
    keywords: "lambo,lamborghini,huracan",
  },
  {
    make: "Mazda",
    model: "RX-7 FD",
    yearLabel: "1992-2002",
    bodyStyle: "Coupe",
    horsepower: 255,
    topSpeed: 250,
    estimatedValue: 65000,
    rarity: "Rare",
    origin: "Japan",
    notes: "Rotary soul and pop-up headlights.",
    keywords: "rx7,mazda,fd,rotary",
  },
  {
    make: "Chevrolet",
    model: "Corvette C8",
    yearLabel: "2020-2025",
    bodyStyle: "Coupe",
    horsepower: 495,
    topSpeed: 312,
    estimatedValue: 78000,
    rarity: "Rare",
    origin: "USA",
    notes: "Mid-engine American rocket.",
    keywords: "corvette,chevy,c8",
  },
  {
    make: "Honda",
    model: "Civic Type R",
    yearLabel: "2023-2025",
    bodyStyle: "Hatchback",
    horsepower: 315,
    topSpeed: 272,
    estimatedValue: 45000,
    rarity: "Uncommon",
    origin: "Japan",
    notes: "Front-drive weapon that embarrasses bigger egos.",
    keywords: "civic,honda,typer,type-r",
  },
  {
    make: "Mercedes-AMG",
    model: "GT R",
    yearLabel: "2017-2021",
    bodyStyle: "Coupe",
    horsepower: 577,
    topSpeed: 318,
    estimatedValue: 160000,
    rarity: "Epic",
    origin: "Germany",
    notes: "Green hell vibes with a twin-turbo V8 bark.",
    keywords: "amg,mercedes,gtr",
  },
  {
    make: "McLaren",
    model: "570S",
    yearLabel: "2015-2021",
    bodyStyle: "Coupe",
    horsepower: 562,
    topSpeed: 328,
    estimatedValue: 150000,
    rarity: "Legendary",
    origin: "UK",
    notes: "Butterfly doors and carbon-heavy energy.",
    keywords: "mclaren,570s",
  },
  {
    make: "Subaru",
    model: "WRX STI",
    yearLabel: "2015-2021",
    bodyStyle: "Sedan",
    horsepower: 310,
    topSpeed: 250,
    estimatedValue: 32000,
    rarity: "Uncommon",
    origin: "Japan",
    notes: "Boxer growl and rally DNA.",
    keywords: "subaru,wrx,sti",
  },
  {
    make: "Audi",
    model: "R8 V10",
    yearLabel: "2015-2023",
    bodyStyle: "Coupe",
    horsepower: 562,
    topSpeed: 330,
    estimatedValue: 145000,
    rarity: "Epic",
    origin: "Germany",
    notes: "Everyday exotic with a screaming V10.",
    keywords: "audi,r8,v10",
  },
  {
    make: "Tesla",
    model: "Model S Plaid",
    yearLabel: "2021-2025",
    bodyStyle: "Sedan",
    horsepower: 1020,
    topSpeed: 322,
    estimatedValue: 90000,
    rarity: "Rare",
    origin: "USA",
    notes: "Silent warp drive for the EV spotter.",
    keywords: "tesla,plaid,models",
  },
  {
    make: "Dodge",
    model: "Challenger Hellcat",
    yearLabel: "2015-2023",
    bodyStyle: "Coupe",
    horsepower: 717,
    topSpeed: 315,
    estimatedValue: 70000,
    rarity: "Rare",
    origin: "USA",
    notes: "Supercharged muscle that rattles windows.",
    keywords: "dodge,challenger,hellcat",
  },
  {
    make: "Aston Martin",
    model: "Vantage",
    yearLabel: "2018-2024",
    bodyStyle: "Coupe",
    horsepower: 503,
    topSpeed: 314,
    estimatedValue: 130000,
    rarity: "Epic",
    origin: "UK",
    notes: "British GT posture with serious muscle.",
    keywords: "aston,vantage",
  },
  {
    make: "Volkswagen",
    model: "Golf GTI",
    yearLabel: "2019-2024",
    bodyStyle: "Hatchback",
    horsepower: 241,
    topSpeed: 250,
    estimatedValue: 28000,
    rarity: "Common",
    origin: "Germany",
    notes: "Hot-hatch default — always worth a spot.",
    keywords: "golf,gti,vw",
  },
  {
    make: "Koenigsegg",
    model: "Jesko",
    yearLabel: "2021-2025",
    bodyStyle: "Coupe",
    horsepower: 1280,
    topSpeed: 480,
    estimatedValue: 3000000,
    rarity: "Legendary",
    origin: "Sweden",
    notes: "If you see one IRL, your week is made.",
    keywords: "koenigsegg,jesko",
  },
  {
    make: "Hyundai",
    model: "Ioniq 5 N",
    yearLabel: "2024-2025",
    bodyStyle: "Crossover",
    horsepower: 641,
    topSpeed: 260,
    estimatedValue: 75000,
    rarity: "Uncommon",
    origin: "Korea",
    notes: "EV hatch that plays fake shifts and real grip.",
    keywords: "ioniq,hyundai,n",
  },
];

async function emptyDb(): Promise<DbShape> {
  return {
    users: [],
    cards: [],
    catalog: DEFAULT_CATALOG.map((c) => ({ ...c, id: randomUUID() })),
  };
}

async function readDb(): Promise<DbShape> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as DbShape;
    if (!parsed.catalog?.length) {
      parsed.catalog = (await emptyDb()).catalog;
      await writeDb(parsed);
    }
    return parsed;
  } catch {
    const fresh = await emptyDb();
    await writeDb(fresh);
    return fresh;
  }
}

async function writeDb(db: DbShape) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export const store = {
  async findUserByGuestToken(guestToken: string) {
    const db = await readDb();
    return db.users.find((u) => u.guestToken === guestToken) ?? null;
  },

  async createUser(guestToken: string) {
    const db = await readDb();
    const user: User = {
      id: randomUUID(),
      guestToken,
      googleSub: null,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    await writeDb(db);
    return user;
  },

  async listCards(userId: string) {
    const db = await readDb();
    return db.cards
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getCard(id: string, userId: string) {
    const db = await readDb();
    return db.cards.find((c) => c.id === id && c.userId === userId) ?? null;
  },

  async createCard(input: Omit<Card, "id" | "createdAt">) {
    const db = await readDb();
    const card: Card = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    db.cards.push(card);
    await writeDb(db);
    return card;
  },

  async listCatalog() {
    const db = await readDb();
    return db.catalog;
  },

  async listMappedCards(userId: string) {
    const cards = await this.listCards(userId);
    return cards.filter((c) => c.lat != null && c.lng != null);
  },
};
