import type { UfBreakdown } from "./projection/types";
import type { OfficialSnapshot, SeriesPoint } from "./types";

export interface SimT2Meta {
  titulo: string;
  premisaAbstencao: string;
  pesquisas: { nome: string; flavio: number; lula: number }[];
  mediaValidos: { flavio: number; lula: number };
  totais: {
    eleitorado: number;
    comparecimento: number;
    validos: number;
    votosFlavio: number;
    votosLula: number;
    pctFlavio: number;
    pctLula: number;
  };
  transferencia: {
    novosVotosValidos: number;
    terceiraVia: number;
    extraFlavio: number;
    extraLula: number;
    shareFlavioDoExtra: number;
    poolAproximado: number;
  };
  nota: string;
}

interface RawPoint {
  t: string;
  pctSecoes: number;
  candidatos: {
    numero: string;
    nomeUrna: string;
    pctValidos: number;
    votos: number;
  }[];
  secoesApuradas: number;
  secoesTotal: number;
  votosValidos: number;
  minutesFromStart?: number;
  hora?: string;
}

export interface SimT2Payload {
  meta: SimT2Meta;
  series: RawPoint[];
}

const RACE_KEY = "2026-t2-presidente-br-sim";

export function simRaceKey() {
  return RACE_KEY;
}

export async function loadSimT2(): Promise<SimT2Payload> {
  const base = import.meta.env.BASE_URL ?? "/";
  const url = `${base}sim-t2-series.json`.replace(/([^:]\/)\/+/g, "$1");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sim-t2 HTTP ${res.status}`);
  return res.json() as Promise<SimT2Payload>;
}

export function simPointToSnapshot(p: RawPoint, raceKey = RACE_KEY): OfficialSnapshot {
  const candidatos = [...p.candidatos]
    .sort((a, b) => b.votos - a.votos)
    .map((c, i) => ({
      numero: c.numero,
      sqcand: `sim-${c.numero}`,
      nomeUrna: c.nomeUrna,
      partido: c.numero === "22" ? "PL" : "PT",
      votos: c.votos,
      pctValidos: c.pctValidos,
      situacao: "sim",
      posicao: i + 1,
    }));

  return {
    raceKey,
    cargo: "presidente",
    abrangencia: "BR",
    eleicaoCodigo: "6258",
    ciclo: "ele2026",
    turno: 2,
    coletadoEm: p.t,
    geradoEmTse: p.t,
    idg: `sim-t2-${p.pctSecoes.toFixed(2)}`,
    secoesTotal: p.secoesTotal,
    secoesApuradas: p.secoesApuradas,
    pctSecoes: p.pctSecoes,
    votosValidos: p.votosValidos,
    brancos: 0,
    nulos: 0,
    candidatos,
    fonte: "sim",
  };
}

export function simSeriesToPoints(points: RawPoint[], upToIndex?: number): SeriesPoint[] {
  const slice = upToIndex == null ? points : points.slice(0, upToIndex + 1);
  return slice.map((p) => ({
    t: p.t,
    pctSecoes: p.pctSecoes,
    candidatos: p.candidatos.map((c) => ({
      numero: c.numero,
      pctValidos: c.pctValidos,
      votos: c.votos,
    })),
  }));
}

/** Perfil eleitoral sintético: share relativo do eleitorado + lean Flávio (pp sobre a média). */
const UF_SIM_PROFILE: {
  uf: string;
  weight: number;
  leanFlavio: number;
  speed: number;
  secoes: number;
}[] = [
  { uf: "SP", weight: 0.22, leanFlavio: 1.5, speed: 1.15, secoes: 95000 },
  { uf: "MG", weight: 0.105, leanFlavio: 0.5, speed: 1.05, secoes: 48000 },
  { uf: "RJ", weight: 0.085, leanFlavio: -1.0, speed: 1.1, secoes: 32000 },
  { uf: "BA", weight: 0.07, leanFlavio: -8.0, speed: 0.75, secoes: 38000 },
  { uf: "RS", weight: 0.055, leanFlavio: 6.0, speed: 1.25, secoes: 25000 },
  { uf: "PR", weight: 0.055, leanFlavio: 7.0, speed: 1.3, secoes: 24000 },
  { uf: "PE", weight: 0.045, leanFlavio: -7.0, speed: 0.8, secoes: 22000 },
  { uf: "CE", weight: 0.04, leanFlavio: -6.5, speed: 0.78, secoes: 20000 },
  { uf: "SC", weight: 0.035, leanFlavio: 10.0, speed: 1.35, secoes: 15000 },
  { uf: "GO", weight: 0.03, leanFlavio: 5.0, speed: 1.2, secoes: 14000 },
  { uf: "PA", weight: 0.03, leanFlavio: -3.0, speed: 0.7, secoes: 16000 },
  { uf: "MA", weight: 0.028, leanFlavio: -9.0, speed: 0.72, secoes: 15000 },
  { uf: "PB", weight: 0.018, leanFlavio: -6.0, speed: 0.8, secoes: 9000 },
  { uf: "ES", weight: 0.018, leanFlavio: 2.0, speed: 1.1, secoes: 8500 },
  { uf: "AM", weight: 0.016, leanFlavio: -2.5, speed: 0.65, secoes: 8000 },
  { uf: "MT", weight: 0.016, leanFlavio: 8.0, speed: 1.22, secoes: 7500 },
  { uf: "RN", weight: 0.015, leanFlavio: -5.5, speed: 0.82, secoes: 7500 },
  { uf: "PI", weight: 0.014, leanFlavio: -8.5, speed: 0.74, secoes: 7000 },
  { uf: "AL", weight: 0.014, leanFlavio: -5.0, speed: 0.8, secoes: 7000 },
  { uf: "DF", weight: 0.014, leanFlavio: 1.0, speed: 1.2, secoes: 5500 },
  { uf: "MS", weight: 0.012, leanFlavio: 6.5, speed: 1.18, secoes: 6000 },
  { uf: "SE", weight: 0.01, leanFlavio: -6.0, speed: 0.78, secoes: 5000 },
  { uf: "RO", weight: 0.008, leanFlavio: 9.0, speed: 1.15, secoes: 4000 },
  { uf: "TO", weight: 0.007, leanFlavio: -1.5, speed: 0.85, secoes: 3500 },
  { uf: "AC", weight: 0.004, leanFlavio: 7.0, speed: 1.0, secoes: 2000 },
  { uf: "AP", weight: 0.0035, leanFlavio: -2.0, speed: 0.7, secoes: 1800 },
  { uf: "RR", weight: 0.0025, leanFlavio: 8.0, speed: 1.05, secoes: 1200 },
  { uf: "ZZ", weight: 0.005, leanFlavio: 3.0, speed: 0.9, secoes: 1500 },
];

/**
 * Breakdown UF sintético coerente com o final das pesquisas e o ritmo da noite
 * (Sul/SE mais cedo; N/NE depois).
 */
export function buildSimUfBreakdown(
  pctSecoesNacional: number,
  meta: SimT2Meta,
): UfBreakdown[] {
  const finalValidos = meta.totais.validos;
  const baseF = meta.mediaValidos.flavio;

  return UF_SIM_PROFILE.map((p) => {
    const progress = Math.max(0, Math.min(100, pctSecoesNacional * p.speed));
    const secoesApuradas = Math.round((p.secoes * progress) / 100);
    const ufValidosFinal = Math.round(finalValidos * p.weight);
    const flavioPct = Math.max(5, Math.min(95, baseF + p.leanFlavio));
    const lulaPct = Math.max(5, Math.min(95, 100 - flavioPct));
    // renormaliza leve
    const sum = flavioPct + lulaPct;
    const fShare = flavioPct / sum;
    const lShare = lulaPct / sum;
    const votosAgora = Math.round(ufValidosFinal * (progress / 100));
    const votosF = Math.round(votosAgora * fShare);
    const votosL = Math.max(0, votosAgora - votosF);

    return {
      uf: p.uf,
      secoesTotal: p.secoes,
      secoesApuradas,
      pctSecoes: progress,
      votosValidos: votosAgora,
      candidatos: [
        {
          numero: "22",
          nomeUrna: "FLÁVIO BOLSONARO",
          votos: votosF,
          pctValidos: votosAgora > 0 ? (100 * votosF) / votosAgora : fShare * 100,
        },
        {
          numero: "13",
          nomeUrna: "LULA",
          votos: votosL,
          pctValidos: votosAgora > 0 ? (100 * votosL) / votosAgora : lShare * 100,
        },
      ],
    };
  });
}
