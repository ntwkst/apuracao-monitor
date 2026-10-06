export interface MethodCandidate {
  numero: string;
  nomeUrna: string;
  pctProjetado: number;
}

export interface MethodResult {
  id: "trajetoria" | "linear" | "remanescente_uf" | "prior_pesquisas";
  label: string;
  disponivel: boolean;
  motivo?: string;
  lider: string | null;
  candidatos: MethodCandidate[];
  nota: string;
}

export interface UfBreakdown {
  uf: string;
  secoesTotal: number;
  secoesApuradas: number;
  pctSecoes: number;
  votosValidos: number;
  candidatos: {
    numero: string;
    nomeUrna: string;
    votos: number;
    pctValidos: number;
  }[];
}

export interface ConsensusResult {
  empate: boolean;
  lider: string | null;
  nomeLider: string | null;
  placar: string;
  votos: Record<string, number>;
  pctMedias: MethodCandidate[];
  gapMedio: number | null;
  metodosUsados: number;
  chips: { id: string; label: string; lider: string | null; ok: boolean }[];
  nota: string;
}

/** Média Palver/GERP/Futura/Veritá (válidos) usada no sim T2. */
export const POLL_PRIOR_T2: Record<string, number> = {
  "22": 52.34575,
  "13": 47.65425,
};
