export type Abrangencia = "BR" | string; // BR or UF code uppercase

export interface CandidateSnap {
  numero: string;
  sqcand: string;
  nomeUrna: string;
  partido: string;
  votos: number;
  pctValidos: number;
  situacao: string;
  posicao: number;
}

export interface OfficialSnapshot {
  raceKey: string;
  cargo: "presidente" | "governador";
  abrangencia: Abrangencia;
  eleicaoCodigo: string;
  ciclo: string;
  turno: number;
  coletadoEm: string;
  geradoEmTse: string | null;
  idg: string | null;
  secoesTotal: number;
  secoesApuradas: number;
  pctSecoes: number;
  votosValidos: number;
  brancos: number;
  nulos: number;
  candidatos: CandidateSnap[];
  fonte: "tse" | "sim";
}

export interface SeriesPoint {
  t: string;
  pctSecoes: number;
  candidatos: { numero: string; pctValidos: number; votos: number }[];
}

export interface TrajectoryProjection {
  method: "trajetoria_abertura";
  asOf: string;
  pctSecoes: number;
  candidatos: {
    numero: string;
    nomeUrna: string;
    pctOficial: number;
    pctProjetado: number;
    pctBaixo: number;
    pctAlto: number;
    inclinacao: number;
  }[];
  gapOficial: number | null;
  gapProjetado: number | null;
  gapAberturaPorPontoSecao: number | null;
  matematicamenteDefinido: boolean;
  podeVirar: boolean;
  nota: string;
}

export interface LinearProjection {
  method: "linear";
  candidatos: {
    numero: string;
    votosProjetados: number;
    pctProjetado: number;
  }[];
}

export interface RaceConfig {
  raceKey: string;
  cargo: "presidente" | "governador";
  abrangencia: Abrangencia;
  eleicaoCodigo: string;
  ciclo: string;
  turno: number;
  cargoCodigo: string; // e.g. 0001
  enabled: boolean;
}
