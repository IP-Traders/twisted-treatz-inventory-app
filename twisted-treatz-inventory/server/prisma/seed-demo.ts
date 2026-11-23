// ─── Demo seed ───────────────────────────────────────────────────────
// Seeds the PUBLIC DEMO database with entirely invented data: fake
// products, fake brands, fake suppliers, fake prices, fake staff and a
// shared demo admin. Nothing in here comes from the real Twisted Treatz
// catalogue — do NOT point this at the production database.
//
// Demo credentials (public by design, shown on the demo login screens):
//   Admin: demo@twistedtreatz.com / demo1234
//   Team:  any member, PIN 1234
//
// Usage (same wipe guard as seed.ts):
//   DATABASE_URL=<demo db url> SEED_ALLOW_WIPE=<db host> npx tsx prisma/seed-demo.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
function daysAgo(n: number, hour = 10, minute = 0): Date {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  // ─── Wipe guard (same contract as seed.ts) ─────────────────────────
  const dbHost = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").hostname;
    } catch {
      return "";
    }
  })();
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed with NODE_ENV=production.");
  }
  if (!dbHost || process.env.SEED_ALLOW_WIPE !== dbHost) {
    throw new Error(
      `Refusing to seed: this wipes EVERYTHING (including admins and team members) ` +
        `in the database at "${dbHost || "(unparseable DATABASE_URL)"}". ` +
        `Re-run with SEED_ALLOW_WIPE=${dbHost || "<db host>"} if that is the demo database.`,
    );
  }
  console.log(`Seeding DEMO data into ${dbHost}.`);

  // Full reset — demo reseeds are meant to be deterministic.
  await prisma.$transaction([
    prisma.receipt.deleteMany(),
    prisma.removal.deleteMany(),
    prisma.adjustment.deleteMany(),
    prisma.alertLog.deleteMany(),
    prisma.product.deleteMany(),
    prisma.productGroup.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.admin.deleteMany(),
  ]);

  // ─── Brands (invented) ─────────────────────────────────────────────
  const brandNames = [
    "Acme Candy Co.",
    "Sugar Rush Ltd.",
    "Choco Loco",
    "Sprinkle Works",
    "Fizzy Pop Inc.",
  ];
  const brandId = new Map<string, number>();
  for (const name of brandNames) {
    const b = await prisma.brand.create({ data: { name } });
    brandId.set(name, b.id);
  }

  // ─── Product groups (variations demo) ──────────────────────────────
  const gummyGroup = await prisma.productGroup.create({
    data: { name: "Gummy Bears", variantLabel: "Flavor" },
  });
  const cupGroup = await prisma.productGroup.create({
    data: { name: "Paper Cups", variantLabel: "Size" },
  });

  // ─── Products (all invented) ───────────────────────────────────────
  type P = {
    name: string;
    category: string;
    flavor?: string;
    purchaseUnit: string;
    packSize?: number;
    uom?: string;
    brand?: string;
    supplier?: string;
    usedIn?: string;
    qty: number;
    threshold?: number;
    price?: number;
    highRisk?: boolean;
    groupId?: number;
    variant?: string;
  };

  const SUPPLIERS = ["Sweet Supplies Inc.", "Candyland Wholesale", "Metro Food Service"];

  const products: P[] = [
    // Candy
    { name: "Gummy Bears — Strawberry", category: "Candy", flavor: "Strawberry", purchaseUnit: "Bag", packSize: 5, uom: "lb", brand: "Sugar Rush Ltd.", supplier: SUPPLIERS[0], usedIn: "Pick & Mix", qty: 42, threshold: 15, price: 12.5, groupId: gummyGroup.id, variant: "Strawberry" },
    { name: "Gummy Bears — Cola", category: "Candy", flavor: "Cola", purchaseUnit: "Bag", packSize: 5, uom: "lb", brand: "Sugar Rush Ltd.", supplier: SUPPLIERS[0], usedIn: "Pick & Mix", qty: 8, threshold: 15, price: 12.5, groupId: gummyGroup.id, variant: "Cola" },
    { name: "Gummy Bears — Sour Apple", category: "Candy", flavor: "Sour Apple", purchaseUnit: "Bag", packSize: 5, uom: "lb", brand: "Sugar Rush Ltd.", supplier: SUPPLIERS[0], usedIn: "Pick & Mix", qty: 27, threshold: 15, price: 13.0, groupId: gummyGroup.id, variant: "Sour Apple" },
    { name: "Rainbow Sour Belts", category: "Candy", purchaseUnit: "Box", packSize: 3, uom: "lb", brand: "Sugar Rush Ltd.", supplier: SUPPLIERS[1], usedIn: "Pick & Mix", qty: 19, threshold: 10, price: 15.75 },
    { name: "Rock Candy Sticks", category: "Candy", purchaseUnit: "Box", packSize: 36, uom: "ct", brand: "Acme Candy Co.", supplier: SUPPLIERS[1], qty: 12, threshold: 6, price: 21.0 },
    { name: "Bubblegum Balls", category: "Candy", purchaseUnit: "Bucket", packSize: 850, uom: "ct", brand: "Acme Candy Co.", supplier: SUPPLIERS[1], usedIn: "Gumball Machine", qty: 4, threshold: 5, price: 34.99 },

    // Chocolate
    { name: "Milk Chocolate Chips", category: "Chocolate", purchaseUnit: "Bag", packSize: 10, uom: "lb", brand: "Choco Loco", supplier: SUPPLIERS[0], usedIn: "Dipped Treats", qty: 31, threshold: 12, price: 28.4, highRisk: true },
    { name: "White Chocolate Melts", category: "Chocolate", purchaseUnit: "Bag", packSize: 10, uom: "lb", brand: "Choco Loco", supplier: SUPPLIERS[0], usedIn: "Dipped Treats", qty: 9, threshold: 12, price: 31.0, highRisk: true },
    { name: "Dark Chocolate Bars", category: "Chocolate", purchaseUnit: "Box", packSize: 24, uom: "ct", brand: "Choco Loco", supplier: SUPPLIERS[2], qty: 16, threshold: 8, price: 42.0 },
    { name: "Cocoa Powder", category: "Chocolate", purchaseUnit: "Tub", packSize: 25, uom: "lb", brand: "Choco Loco", supplier: SUPPLIERS[2], usedIn: "Hot Cocoa", qty: 6, threshold: 4, price: 55.0 },

    // Toppings
    { name: "Rainbow Sprinkles", category: "Toppings", purchaseUnit: "Jar", packSize: 2, uom: "lb", brand: "Sprinkle Works", supplier: SUPPLIERS[0], usedIn: "Dipped Treats", qty: 22, threshold: 10, price: 8.25 },
    { name: "Crushed Cookie Crumbs", category: "Toppings", purchaseUnit: "Bag", packSize: 4, uom: "lb", brand: "Sprinkle Works", supplier: SUPPLIERS[0], usedIn: "Dipped Treats", qty: 3, threshold: 8, price: 11.5 },
    { name: "Mini Marshmallows", category: "Toppings", purchaseUnit: "Bag", packSize: 3, uom: "lb", brand: "Sugar Rush Ltd.", supplier: SUPPLIERS[1], usedIn: "Hot Cocoa", qty: 25, threshold: 10, price: 7.8 },
    { name: "Caramel Drizzle Sauce", category: "Toppings", purchaseUnit: "Bottle", packSize: 64, uom: "oz", brand: "Acme Candy Co.", supplier: SUPPLIERS[2], usedIn: "Sundaes", qty: 14, threshold: 6, price: 16.95, highRisk: true },

    // Drinks
    { name: "Cola Syrup", category: "Drinks", purchaseUnit: "Jug", packSize: 1, uom: "gal", brand: "Fizzy Pop Inc.", supplier: SUPPLIERS[2], usedIn: "Fountain Drinks", qty: 18, threshold: 8, price: 24.0 },
    { name: "Blue Raspberry Slush Mix", category: "Drinks", purchaseUnit: "Jug", packSize: 1, uom: "gal", brand: "Fizzy Pop Inc.", supplier: SUPPLIERS[2], usedIn: "Slushies", qty: 7, threshold: 8, price: 26.5 },
    { name: "Lemonade Concentrate", category: "Drinks", purchaseUnit: "Jug", packSize: 0.5, uom: "gal", brand: "Fizzy Pop Inc.", supplier: SUPPLIERS[2], usedIn: "Lemonade Stand", qty: 20, threshold: 10, price: 13.25 },

    // Packaging
    { name: "Paper Cups — 12 oz", category: "Packaging", purchaseUnit: "Case", packSize: 1000, uom: "ct", supplier: SUPPLIERS[1], usedIn: "Fountain Drinks", qty: 11, threshold: 5, price: 48.0, groupId: cupGroup.id, variant: "12 oz" },
    { name: "Paper Cups — 16 oz", category: "Packaging", purchaseUnit: "Case", packSize: 1000, uom: "ct", supplier: SUPPLIERS[1], usedIn: "Fountain Drinks", qty: 2, threshold: 5, price: 56.0, groupId: cupGroup.id, variant: "16 oz" },
    { name: "Candy Treat Bags", category: "Packaging", purchaseUnit: "Case", packSize: 500, uom: "ct", supplier: SUPPLIERS[1], usedIn: "Pick & Mix", qty: 9, threshold: 4, price: 22.0 },
    { name: "Gift Boxes — Small", category: "Packaging", purchaseUnit: "Case", packSize: 100, uom: "ct", supplier: SUPPLIERS[1], qty: 13, threshold: 4, price: 35.0 },
    { name: "Wooden Treat Sticks", category: "Packaging", purchaseUnit: "Box", packSize: 1000, uom: "ct", supplier: SUPPLIERS[0], usedIn: "Dipped Treats", qty: 24, threshold: 10, price: 9.5 },
  ];

  const created: { id: number; qty: number; name: string }[] = [];
  for (const p of products) {
    const row = await prisma.product.create({
      data: {
        name: p.name,
        category: p.category,
        flavor: p.flavor ?? null,
        purchaseUnit: p.purchaseUnit,
        unitSize: p.packSize && p.uom ? `${p.packSize} ${p.uom}` : null,
        packSize: p.packSize ?? null,
        uom: p.uom ?? null,
        brandId: p.brand ? (brandId.get(p.brand) ?? null) : null,
        supplier: p.supplier ?? null,
        usedIn: p.usedIn ?? null,
        currentQty: p.qty,
        alertThreshold: p.threshold ?? 10,
        unitPrice: p.price ?? null,
        highRisk: p.highRisk ?? false,
        groupId: p.groupId ?? null,
        variant: p.variant ?? null,
        active: true,
      },
    });
    created.push({ id: row.id, qty: p.qty, name: p.name });
  }
  console.log(`Created ${created.length} demo products, ${brandNames.length} brands, 2 groups.`);

  // ─── Demo admin + team (public demo credentials) ───────────────────
  const admin = await prisma.admin.create({
    data: {
      email: "demo@twistedtreatz.com",
      passwordHash: await bcrypt.hash("demo1234", 12),
      name: "Demo Admin",
    },
  });

  const pinHash = await bcrypt.hash("1234", 12);
  const members = [];
  for (const m of [
    { name: "Demo Dana", initials: "DD" },
    { name: "Sample Sam", initials: "SS" },
    { name: "Test Tina", initials: "TT" },
    { name: "Practice Pete", initials: "PP" },
  ]) {
    members.push(await prisma.teamMember.create({ data: { ...m, pinHash, active: true } }));
  }
  console.log(`Created demo admin (demo@twistedtreatz.com / demo1234) and ${members.length} team members (PIN 1234).`);

  // ─── Movement history (last two weeks + today) ─────────────────────
  // Each row is internally consistent (before − qty = after); currentQty
  // above is simply the latest state the story ends on.
  const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];

  let removals = 0;
  for (let d = 13; d >= 0; d--) {
    const perDay = d % 3 === 0 ? 3 : 2;
    for (let k = 0; k < perDay; k++) {
      const prod = pick(created, d * 3 + k);
      const qty = 1 + ((d + k) % 4);
      const before = prod.qty + qty + d; // plausible historical level
      await prisma.removal.create({
        data: {
          productId: prod.id,
          teamMemberId: pick(members, d + k).id,
          qty,
          qtyBefore: before,
          qtyAfter: before - qty,
          createdAt: daysAgo(d, 9 + k * 3, (d * 7) % 60),
        },
      });
      removals++;
    }
  }

  let receipts = 0;
  for (let d = 12; d >= 1; d -= 3) {
    for (let k = 0; k < 2; k++) {
      const prod = pick(created, d * 5 + k);
      const expected = 10 + ((d + k) % 3) * 5;
      const actual = k === 1 && d === 6 ? expected - 2 : expected; // one short delivery
      await prisma.receipt.create({
        data: {
          productId: prod.id,
          adminId: admin.id,
          supplier: pick(SUPPLIERS, d + k),
          expectedQty: expected,
          actualQty: actual,
          unitPrice: 10 + ((d * k) % 20),
          notes: actual !== expected ? "Two cases damaged in transit (demo note)" : null,
          createdAt: daysAgo(d, 8, 30),
        },
      });
      receipts++;
    }
  }

  const batchId = randomUUID();
  let adjustments = 0;
  for (let k = 0; k < 4; k++) {
    const prod = pick(created, k * 7 + 2);
    const delta = k % 2 === 0 ? -(k + 1) : k + 2;
    const before = prod.qty - delta + 3;
    await prisma.adjustment.create({
      data: {
        productId: prod.id,
        adminId: admin.id,
        delta,
        qtyBefore: before,
        qtyAfter: before + delta,
        reason: "Weekly cycle count (demo)",
        batchId,
        createdAt: daysAgo(4, 16, 15),
      },
    });
    adjustments++;
  }

  console.log(`Created ${removals} removals, ${receipts} receipts, ${adjustments} adjustments.`);
  console.log("\nDemo seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Demo seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
