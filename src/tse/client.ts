import type { Abrangencia, CandidateSnap, OfficialSnapshot, RaceConfig } from "../types.js";

const BASE = "https://resultados.tse.jus.br";

function padEleicao(code: string): string {
  return code.padStart(6, "0");
}

function parsePtNumber(raw: string | number | undefined | null): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const n = Number(String(raw).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function parsePtPct(raw: string | number | undefined | null): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function buildUnifiedUrl(cfg: RaceConfig, uf: string): string {
  const ciclo = cfg.ciclo;
  const ele = cfg.eleicaoCodigo;
  const cargo = cfg.cargoCodigo;
  const u = uf.toLowerCase();
  return `${BASE}/oficial/${ciclo}/${ele}/dados/${u}/${u}-c${cargo}-e${padEleicao(ele)}-u.json`;
}

export function buildAcompanhamentoUrl(cfg: RaceConfig, uf: string): string {
  const ciclo = cfg.ciclo;
  const ele = cfg.eleicaoCodigo;
  const u = uf.toLowerCase();
  return `${BASE}/oficial/${ciclo}/${ele}/dados/${u}/${u}-e${padEleicao(ele)}-ab.json`;
}

const UFS = [
  "ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms", "mg",
  "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "sp", "se", "to", "zz",
] as const;

interface RawCand {
  n: string;
  sqcand: string;
  nm: string;
  nmu: string;
  st?: string;
  vap: string;
  pvap: string;
  seq?: string;
}

function extractCandidatesFromUnified(raw: unknown): {
  candidatos: CandidateSnap[];
  votosValidos: number;
  idg: string | null;
  geradoEmTse: string | null;
} {
  const root = raw as Record<string, unknown>;
  const idg = root.idg != null ? String(root.idg) : null;
  const dg = root.dg != null ? String(root.dg) : null;
  const hg = root.ht != null ? String(root.ht) : root.hg != null ? String(root.hg) : null;
  const geradoEmTse = dg && hg ? `${dg} ${hg}` : null;

  const candidatos: CandidateSnap[] = [];
  const carg = (root.carg as unknown[]) ?? [];
  for (const c of carg) {
    const cargo = c as Record<string, unknown>;
    const agr = (cargo.agr as unknown[]) ?? [];
    for (const a of agr) {
      const bloco = a as Record<string, unknown>;
      const parList = (bloco.par as unknown[]) ?? [];
      // Coligação: candidatos podem estar no bloco sem par detalhado
      if (Array.isArray(bloco.cand)) {
        for (const cand of bloco.cand as RawCand[]) {
          candidatos.push(mapCand(cand, String(bloco.com ?? "")));
        }
      }
      for (const p of parList) {
        const partido = p as Record<string, unknown>;
        const sg = String(partido.sg ?? bloco.com ?? "");
        for (const cand of (partido.cand as RawCand[]) ?? []) {
          candidatos.push(mapCand(cand, sg));
        }
      }
    }
  }

  // Dedup by sqcand (coligações podem repetir)
  const bySq = new Map<string, CandidateSnap>();
  for (const c of candidatos) {
    const prev = bySq.get(c.sqcand);
    if (!prev || c.votos > prev.votos) bySq.set(c.sqcand, c);
  }
  const unique = [...bySq.values()].sort((a, b) => b.votos - a.votos);
  unique.forEach((c, i) => {
    c.posicao = i + 1;
  });
  const votosValidos = unique.reduce((s, c) => s + c.votos, 0);
  return { candidatos: unique, votosValidos, idg, geradoEmTse };
}

function mapCand(cand: RawCand, partido: string): CandidateSnap {
  return {
    numero: String(cand.n),
    sqcand: String(cand.sqcand),
    nomeUrna: String(cand.nmu || cand.nm),
    partido,
    votos: parsePtNumber(cand.vap),
    pctValidos: parsePtPct(cand.pvap),
    situacao: String(cand.st ?? ""),
    posicao: parsePtNumber(cand.seq) || 0,
  };
}

function secoesFromS(s: Record<string, unknown> | undefined): {
  secoesTotal: number;
  secoesApuradas: number;
  pctSecoes: number;
} | null {
  if (!s) return null;
  const secoesTotal = parsePtNumber(s.ts as string);
  const secoesApuradas = parsePtNumber(s.st as string);
  if (secoesTotal <= 0) return null;
  const pctSecoes =
    secoesTotal > 0 ? (100 * secoesApuradas) / secoesTotal : parsePtPct(s.pst as string);
  return { secoesTotal, secoesApuradas, pctSecoes };
}

/** Preferir rollup `cdabr=br`; senão somar só UFs (sem o nó BR, que duplicaria). */
function extractSecoesFromAb(raw: unknown, abr: Abrangencia): {
  secoesTotal: number;
  secoesApuradas: number;
  pctSecoes: number;
} {
  const root = raw as Record<string, unknown>;
  const list = (root.abr as unknown[]) ?? [];
  if (abr === "BR") {
    const rollup = list.find(
      (item) => String((item as Record<string, unknown>).cdabr ?? "").toLowerCase() === "br",
    ) as Record<string, unknown> | undefined;
    const fromRollup = secoesFromS(rollup?.s as Record<string, unknown> | undefined);
    if (fromRollup) return fromRollup;

    let total = 0;
    let apuradas = 0;
    for (const item of list) {
      const u = item as Record<string, unknown>;
      const cd = String(u.cdabr ?? "").toLowerCase();
      if (cd === "br") continue; // evita double-count com o consolidado
      const s = (u.s as Record<string, unknown>) ?? {};
      total += parsePtNumber(s.ts as string);
      apuradas += parsePtNumber(s.st as string);
    }
    const pct = total > 0 ? (100 * apuradas) / total : 0;
    return { secoesTotal: total, secoesApuradas: apuradas, pctSecoes: pct };
  }
  const uf = abr.toLowerCase();
  const target =
    (list.find((item) => String((item as Record<string, unknown>).cdabr ?? "").toLowerCase() === uf) as
      | Record<string, unknown>
      | undefined) ?? (list[0] as Record<string, unknown> | undefined);
  return (
    secoesFromS(target?.s as Record<string, unknown> | undefined) ?? {
      secoesTotal: 0,
      secoesApuradas: 0,
      pctSecoes: 0,
    }
  );
}

function extractSecoesFromUnifiedRoot(raw: unknown): {
  secoesTotal: number;
  secoesApuradas: number;
  pctSecoes: number;
} | null {
  const root = raw as Record<string, unknown>;
  return secoesFromS(root.s as Record<string, unknown> | undefined);
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "apuracao-monitor/0.1 (uso pessoal; contato local)",
    },
  });
  if (!res.ok) {
    throw new Error(`TSE HTTP ${res.status} em ${url}`);
  }
  return res.json();
}

/** Soma UFs para presidente BR — mais resiliente que o JSON nacional gigante. */
async function fetchPresidenteBrasil(cfg: RaceConfig): Promise<OfficialSnapshot> {
  const byCand = new Map<string, CandidateSnap>();
  let idg: string | null = null;
  let geradoEmTse: string | null = null;
  const failed: string[] = [];
  const ok: string[] = [];

  // Sequencial com pausa curta para não martelar o CDN
  for (const uf of UFS) {
    const url = buildUnifiedUrl(cfg, uf);
    try {
      const raw = await fetchJson(url);
      const extracted = extractCandidatesFromUnified(raw);
      if (extracted.idg) idg = extracted.idg;
      if (extracted.geradoEmTse) geradoEmTse = extracted.geradoEmTse;
      for (const c of extracted.candidatos) {
        const prev = byCand.get(c.sqcand);
        if (!prev) {
          byCand.set(c.sqcand, { ...c });
        } else {
          prev.votos += c.votos;
        }
      }
      ok.push(uf);
    } catch (err) {
      failed.push(uf);
      console.warn(`[tse] falha ${uf}:`, err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  // Sem SP/MG/RJ/RS o placar nacional fica mentiroso — não publicar como oficial completo
  const criticas = ["sp", "mg", "rj", "ba", "rs", "pr", "pe", "ce"];
  const criticasFaltando = criticas.filter((u) => failed.includes(u));
  if (ok.length < 20 || criticasFaltando.length > 0) {
    throw new Error(
      `Soma UF incompleta (ok=${ok.length}/${UFS.length}; críticas faltando=${criticasFaltando.join(",") || "—"}; falhas=${failed.join(",")})`,
    );
  }

  const candidatos = [...byCand.values()].sort((a, b) => b.votos - a.votos);
  const votosValidos = candidatos.reduce((s, c) => s + c.votos, 0);
  candidatos.forEach((c, i) => {
    c.posicao = i + 1;
    c.pctValidos = votosValidos > 0 ? (100 * c.votos) / votosValidos : 0;
  });

  const ab = await fetchJson(buildAcompanhamentoUrl(cfg, "br"));
  const secoes = extractSecoesFromAb(ab, "BR");

  return {
    raceKey: cfg.raceKey,
    cargo: cfg.cargo,
    abrangencia: "BR",
    eleicaoCodigo: cfg.eleicaoCodigo,
    ciclo: cfg.ciclo,
    turno: cfg.turno,
    coletadoEm: new Date().toISOString(),
    geradoEmTse,
    idg,
    ...secoes,
    votosValidos,
    brancos: 0,
    nulos: 0,
    candidatos,
    fonte: "tse",
  };
}

async function fetchUfRace(cfg: RaceConfig): Promise<OfficialSnapshot> {
  const uf = cfg.abrangencia.toLowerCase();
  const raw = await fetchJson(buildUnifiedUrl(cfg, uf));
  const extracted = extractCandidatesFromUnified(raw);
  const ab = await fetchJson(buildAcompanhamentoUrl(cfg, uf));
  const secoes = extractSecoesFromAb(ab, cfg.abrangencia);

  const votosValidos =
    extracted.votosValidos ||
    extracted.candidatos.reduce((s, c) => s + c.votos, 0);
  extracted.candidatos.forEach((c, i) => {
    c.posicao = i + 1;
    if (!c.pctValidos && votosValidos > 0) {
      c.pctValidos = (100 * c.votos) / votosValidos;
    }
  });

  return {
    raceKey: cfg.raceKey,
    cargo: cfg.cargo,
    abrangencia: cfg.abrangencia.toUpperCase(),
    eleicaoCodigo: cfg.eleicaoCodigo,
    ciclo: cfg.ciclo,
    turno: cfg.turno,
    coletadoEm: new Date().toISOString(),
    geradoEmTse: extracted.geradoEmTse,
    idg: extracted.idg,
    ...secoes,
    votosValidos,
    brancos: 0,
    nulos: 0,
    candidatos: extracted.candidatos,
    fonte: "tse",
  };
}

export async function fetchOfficialSnapshot(cfg: RaceConfig): Promise<OfficialSnapshot> {
  if (cfg.cargo === "presidente" && cfg.abrangencia === "BR") {
    // Preferir arquivo BR direto (totais no topo); fallback para soma de UFs
    try {
      const raw = await fetchJson(buildUnifiedUrl(cfg, "br"));
      const extracted = extractCandidatesFromUnified(raw);
      if (extracted.candidatos.length > 0 && extracted.votosValidos > 0) {
        const fromRoot = extractSecoesFromUnifiedRoot(raw);
        const ab = await fetchJson(buildAcompanhamentoUrl(cfg, "br"));
        const secoes = fromRoot ?? extractSecoesFromAb(ab, "BR");
        return {
          raceKey: cfg.raceKey,
          cargo: "presidente",
          abrangencia: "BR",
          eleicaoCodigo: cfg.eleicaoCodigo,
          ciclo: cfg.ciclo,
          turno: cfg.turno,
          coletadoEm: new Date().toISOString(),
          geradoEmTse: extracted.geradoEmTse,
          idg: extracted.idg,
          ...secoes,
          votosValidos: extracted.votosValidos,
          brancos: 0,
          nulos: 0,
          candidatos: extracted.candidatos,
          fonte: "tse",
        };
      }
    } catch (err) {
      console.warn("[tse] BR unificado falhou, somando UFs:", err instanceof Error ? err.message : err);
    }
    return fetchPresidenteBrasil(cfg);
  }
  return fetchUfRace(cfg);
}

export const DEFAULT_RACES: RaceConfig[] = [
  {
    raceKey: "2026-t1-presidente-br",
    cargo: "presidente",
    abrangencia: "BR",
    eleicaoCodigo: "6257",
    ciclo: "ele2026",
    turno: 1,
    cargoCodigo: "0001",
    enabled: true,
  },
  {
    raceKey: "2026-t1-governador-ms",
    cargo: "governador",
    abrangencia: "MS",
    eleicaoCodigo: "6259",
    ciclo: "ele2026",
    turno: 1,
    cargoCodigo: "0003",
    enabled: true,
  },
];
