// Set every team member's 4-digit floor PIN to a single shared code.
// Use when the crew should log in with one known code (e.g. "2008") and
// nobody without that code can get past the PinPad.
//
//   Dry run (no writes, just lists who would change):
//     npx tsx --env-file=.env scripts/set-team-pin.ts 2008 --dry-run
//
//   Apply:
//     npx tsx --env-file=.env scripts/set-team-pin.ts 2008
//
// NOTE: a single shared PIN means the removals audit log can no longer prove
// WHICH person removed stock — anyone with the code can log in as anyone.
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const pin = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");

  if (!pin || !/^\d{4}$/.test(pin)) {
    console.error(
      "Usage: npx tsx --env-file=.env scripts/set-team-pin.ts <4-digit-pin> [--dry-run]",
    );
    process.exit(1);
  }

  const members = await prisma.teamMember.findMany({
    select: { id: true, name: true, initials: true, active: true },
    orderBy: { id: "asc" },
  });

  if (members.length === 0) {
    console.error("No team members found in the database.");
    process.exit(1);
  }

  console.log(`\nTeam members (${members.length}):`);
  for (const m of members) {
    console.log(`  #${m.id} ${m.name} (${m.initials})${m.active ? "" : " [inactive]"}`);
  }

  if (dryRun) {
    console.log(`\nDRY RUN — no changes written. Would set every PIN above to "${pin}".\n`);
    return;
  }

  const pinHash = await bcrypt.hash(pin, 12);
  const result = await prisma.teamMember.updateMany({ data: { pinHash } });

  console.log(`\nSet PIN "${pin}" for all ${result.count} team members.`);
  console.log("Everyone now logs in with that code; distribute it securely.\n");
}

main()
  .catch((e) => {
    console.error("Failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
