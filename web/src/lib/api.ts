export interface CandidateSnap {
  numero: string;
  nomeUrna: string;
  partido: string;
  votos: number;
  pctValidos: number;
  posicao: number;
}

export interface Snapshot {
  raceKey: string;
  cargo: string;
  abrangencia: string;
  coletadoEm: string;
  geradoEmTse: string | null;
  pctSecoes: number;
  secoesApuradas: number;
  secoesTotal: number;
  votosValidos: number;
  candidatos: CandidateSnap[];
  fonte: string;
}

export interface SeriesPoint {
  t: string;
  pctSecoes: number;
  candidatos: { numero: string; pctValidos: number; votos: number }[];
}

export interface Trajetoria {
  method: string;
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

export interface AtualResponse {
  disponivel: boolean;
  snapshot: Snapshot;
  projetacao: { trajetoria: Trajetoria; linear: unknown };
  serieProjecao: SeriesPoint[];
}

const COLORS: Record<string, string> = {
  "22": "#3b82f6",
  "13": "#ef4444",
  "70": "#a78bfa",
  "50": "#f59e0b",
  "55": "#14b8a6",
  "30": "#22c55e",
};

export function colorFor(numero: string, idx: number): string {
  if (COLORS[numero]) return COLORS[numero]!;
  const palette = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#c084fc", "#fb7185"];
  return palette[idx % palette.length]!;
}

export async function fetchAtual(race: string): Promise<AtualResponse> {
  const res = await fetch(`/api/apuracao/atual?race=${encodeURIComponent(race)}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchHistorico(race: string): Promise<{ series: SeriesPoint[] }> {
  const res = await fetch(`/api/apuracao/historico?race=${encodeURIComponent(race)}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function fetchRaces(): Promise<{ withData: string[]; configured: { raceKey: string }[] }> {
  const res = await fetch("/api/races");
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
