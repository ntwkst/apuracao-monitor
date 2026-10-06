import type { UfBreakdown } from "./projection/types";
import type { OfficialSnapshot, SeriesPoint } from "./types";

const SUPABASE_URL = "https://vtyentzijjlrehkzsnkr.supabase.co";
const SUPABASE_KEY = "sb_publishable_Hfz9jQavwmMmKDCgSJFhWQ_pQSANTw_";
const FN = `${SUPABASE_URL}/functions/v1/apuracao-tse`;

export interface LiveAtual {
  disponivel: boolean;
  motivo?: string;
  dica?: string;
  snapshot?: OfficialSnapshot;
  eleicaoCodigo?: string;
}

async function tseFetch(pathQuery: string): Promise<Response> {
  return fetch(`${FN}${pathQuery}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
}

export async function fetchConfig(turno = 2) {
  const res = await tseFetch(`?op=config&turno=${turno}`);
  if (!res.ok) throw new Error(`config HTTP ${res.status}`);
  return res.json() as Promise<{
    ok: boolean;
    turno: number;
    ciclo: string;
    presidente: string;
    estadual: string;
  }>;
}

export async function fetchLiveSnapshot(opts: {
  cargo: "presidente" | "governador";
  turno: number;
  abrangencia: string;
}): Promise<LiveAtual> {
  const q = new URLSearchParams({
    cargo: opts.cargo,
    turno: String(opts.turno),
    abrangencia: opts.abrangencia,
  });
  const res = await tseFetch(`?${q}`);
  if (!res.ok) throw new Error(`snapshot HTTP ${res.status}`);
  return res.json() as Promise<LiveAtual>;
}

export interface LiveUfs {
  disponivel: boolean;
  motivo?: string;
  ufs?: UfBreakdown[];
  ok?: number;
  failed?: string[];
}

export async function fetchLiveUfs(opts: {
  cargo: "presidente" | "governador";
  turno: number;
}): Promise<LiveUfs> {
  const q = new URLSearchParams({
    op: "ufs",
    cargo: opts.cargo,
    turno: String(opts.turno),
  });
  const res = await tseFetch(`?${q}`);
  if (!res.ok) throw new Error(`ufs HTTP ${res.status}`);
  return res.json() as Promise<LiveUfs>;
}

const DB_NAME = "apuracao-monitor";
const STORE = "series";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        os.createIndex("raceKey", "raceKey", { unique: false });
        os.createIndex("race_time", ["raceKey", "t"], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function appendSnapshot(snap: OfficialSnapshot): Promise<boolean> {
  const db = await openDb();
  const point = {
    raceKey: snap.raceKey,
    t: snap.coletadoEm,
    pctSecoes: snap.pctSecoes,
    idg: snap.idg,
    candidatos: snap.candidatos.map((c) => ({
      numero: c.numero,
      pctValidos: c.pctValidos,
      votos: c.votos,
    })),
    snapshot: snap,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const os = tx.objectStore(STORE);
    const idx = os.index("raceKey");
    const getAll = idx.getAll(snap.raceKey);
    getAll.onsuccess = () => {
      const rows = (getAll.result ?? []) as Array<{ idg?: string | null; pctSecoes: number }>;
      const last = rows[rows.length - 1];
      if (
        last &&
        last.idg &&
        snap.idg &&
        last.idg === snap.idg &&
        Math.abs(last.pctSecoes - snap.pctSecoes) < 0.0001
      ) {
        resolve(false);
        return;
      }
      os.add(point);
    };
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSeries(raceKey: string): Promise<SeriesPoint[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("raceKey");
    const req = idx.getAll(raceKey);
    req.onsuccess = () => {
      const rows = (req.result ?? []) as Array<{
        t: string;
        pctSecoes: number;
        candidatos: SeriesPoint["candidatos"];
      }>;
      rows.sort((a, b) => a.t.localeCompare(b.t));
      resolve(
        rows.map((r) => ({
          t: r.t,
          pctSecoes: r.pctSecoes,
          candidatos: r.candidatos,
        })),
      );
    };
    req.onerror = () => reject(req.error);
  });
}
