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
