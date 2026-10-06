import type { OfficialSnapshot, SeriesPoint } from "./types";

export interface T1ReplayMeta {
  titulo: string;
  final: { flavio: number; lula: number };
  secoesTotal: number;
  pontos: number;
  nota: string;
}

interface RawPoint {
  t: string;
  hora: string;
  minutesFromStart: number;
  pctSecoes: number;
  secoesApuradas: number;
  secoesTotal: number;
  votosValidos: number;
  origem?: string;
  candidatos: {
    numero: string;
    nomeUrna: string;
    pctValidos: number;
    votos: number;
  }[];
}

export interface T1ReplayPayload {
  meta: T1ReplayMeta;
  series: RawPoint[];
}

export const T1_REPLAY_RACE = "2026-t1-presidente-br-replay";

const PARTIDO: Record<string, string> = {
  "22": "PL",
  "13": "PT",
  "70": "AVANTE",
  "14": "MISSÃO",
  "55": "PSD",
};

export async function loadT1Replay(): Promise<T1ReplayPayload> {
  const base = import.meta.env.BASE_URL ?? "/";
  const url = `${base}t1-replay-series.json`.replace(/([^:]\/)\/+/g, "$1");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`t1-replay HTTP ${res.status}`);
  return res.json() as Promise<T1ReplayPayload>;
}

export function t1PointToSnapshot(p: RawPoint, raceKey = T1_REPLAY_RACE): OfficialSnapshot {
  const candidatos = [...p.candidatos]
    .sort((a, b) => b.votos - a.votos)
    .map((c, i) => ({
      numero: c.numero,
      sqcand: `t1-${c.numero}`,
      nomeUrna: c.nomeUrna,
      partido: PARTIDO[c.numero] ?? "",
      votos: c.votos,
      pctValidos: c.pctValidos,
      situacao: "replay",
      posicao: i + 1,
    }));

  return {
    raceKey,
    cargo: "presidente",
    abrangencia: "BR",
    eleicaoCodigo: "6257",
    ciclo: "ele2026",
    turno: 1,
    coletadoEm: p.t,
    geradoEmTse: p.t,
    idg: `t1-${p.pctSecoes.toFixed(2)}-${p.hora}`,
    secoesTotal: p.secoesTotal,
    secoesApuradas: p.secoesApuradas,
    pctSecoes: p.pctSecoes,
    votosValidos: p.votosValidos,
    brancos: 0,
    nulos: 0,
    candidatos,
    fonte: "tse",
  };
}

export function t1SeriesToPoints(points: RawPoint[], upToIndex?: number): SeriesPoint[] {
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
