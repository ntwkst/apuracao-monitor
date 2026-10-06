import { Store } from "../db/store.js";
import { DEFAULT_RACES, fetchOfficialSnapshot } from "../tse/client.js";

const INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 45_000);
const once = process.argv.includes("--once");

async function cycle(store: Store) {
  const races = DEFAULT_RACES.filter((r) => r.enabled);
  for (const race of races) {
    try {
      const snap = await fetchOfficialSnapshot(race);
      const { inserted } = store.insertSnapshot(snap);
      const top = snap.candidatos
        .slice(0, 3)
        .map((c) => `${c.nomeUrna} ${c.pctValidos.toFixed(2)}%`)
        .join(" | ");
      console.log(
        `[poller] ${race.raceKey} secoes=${snap.pctSecoes.toFixed(2)}% ${inserted ? "NOVO" : "dup"} :: ${top}`,
      );
    } catch (err) {
      console.error(`[poller] erro ${race.raceKey}:`, err instanceof Error ? err.message : err);
    }
  }
}

async function main() {
  const store = new Store();
  console.log(`[poller] intervalo=${INTERVAL_MS}ms once=${once}`);
  await cycle(store);
  if (once) return;
  let running = false;
  const tick = async () => {
    if (running) {
      console.warn("[poller] ciclo anterior ainda em andamento — pulando");
      return;
    }
    running = true;
    try {
      await cycle(store);
    } finally {
      running = false;
    }
  };
  setInterval(() => {
    void tick();
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
