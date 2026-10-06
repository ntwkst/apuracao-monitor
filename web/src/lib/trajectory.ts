import type {
  LinearProjection,
  OfficialSnapshot,
  SeriesPoint,
  TrajectoryProjection,
} from "./types";

const WINDOW_MIN_POINTS = 4;
const WINDOW_MAX_POINTS = 24;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Regressão linear simples y = a + b*x */
function linReg(xs: number[], ys: number[]): { a: number; b: number; residualStd: number } {
  const n = xs.length;
  if (n < 2) return { a: ys[0] ?? 0, b: 0, residualStd: 0 };
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - meanX) * (ys[i]! - meanY);
    den += (xs[i]! - meanX) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = meanY - b * meanX;
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const pred = a + b * xs[i]!;
    ss += (ys[i]! - pred) ** 2;
  }
  const residualStd = Math.sqrt(ss / Math.max(1, n - 2));
  return { a, b, residualStd };
}

function pickWindow(series: SeriesPoint[]): SeriesPoint[] {
  // Só pontos com avanço real de seções e % já informativa
  const advancing: SeriesPoint[] = [];
  let last = -1;
  for (const p of series) {
    if (p.pctSecoes < 0.5) continue;
    const hasVotes = p.candidatos.some((c) => c.votos > 0 || c.pctValidos > 0);
    if (!hasVotes) continue;
    if (p.pctSecoes > last + 0.001) {
      advancing.push(p);
      last = p.pctSecoes;
    }
  }
  if (advancing.length <= WINDOW_MAX_POINTS) return advancing;
  return advancing.slice(-WINDOW_MAX_POINTS);
}

/**
 * Projeta % final olhando a trajetória das linhas no gráfico
 * (% votos vs % seções) e a abertura (gap) entre 1º e 2º.
 */
export function projectByTrajectory(
  latest: OfficialSnapshot,
  series: SeriesPoint[],
): TrajectoryProjection {
  const window = pickWindow(series);
  const top = [...latest.candidatos].sort((a, b) => b.votos - a.votos);
  const remaining = Math.max(0, 100 - latest.pctSecoes);

  // Com 100% das seções, o oficial é o final
  if (latest.pctSecoes >= 99.95) {
    const projectedDone = top.map((cand) => ({
      numero: cand.numero,
      nomeUrna: cand.nomeUrna,
      pctOficial: cand.pctValidos,
      pctProjetado: cand.pctValidos,
      pctBaixo: cand.pctValidos,
      pctAlto: cand.pctValidos,
      inclinacao: 0,
    }));
    const gap =
      projectedDone[0] && projectedDone[1]
        ? projectedDone[0].pctOficial - projectedDone[1].pctOficial
        : null;
    return {
      method: "trajetoria_abertura",
      asOf: latest.coletadoEm,
      pctSecoes: latest.pctSecoes,
      candidatos: projectedDone,
      gapOficial: gap,
      gapProjetado: gap,
      gapAberturaPorPontoSecao: 0,
      matematicamenteDefinido: true,
      podeVirar: false,
      nota: "Apuração concluída (100% das seções). Projeção = resultado oficial.",
    };
  }

  const projected: TrajectoryProjection["candidatos"] = [];

  for (const cand of top) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const p of window) {
      const hit = p.candidatos.find((c) => c.numero === cand.numero);
      if (!hit) continue;
      xs.push(p.pctSecoes);
      ys.push(hit.pctValidos);
    }

    let inclinacao = 0;
    let residualStd = 0;
    if (xs.length >= WINDOW_MIN_POINTS) {
      const reg = linReg(xs, ys);
      inclinacao = reg.b; // pontos de % votos por ponto de % seções
      residualStd = reg.residualStd;
    } else if (xs.length >= 2) {
      const reg = linReg(xs, ys);
      inclinacao = reg.b;
      residualStd = reg.residualStd;
    }

    // Suaviza inclinação extrema no começo da noite
    const damp = clamp(latest.pctSecoes / 40, 0.25, 1);
    const incl = inclinacao * damp;

    const pctProjetado = clamp(cand.pctValidos + incl * remaining, 0, 100);
    const band = Math.max(0.15, residualStd * 2 + Math.abs(incl) * remaining * 0.35);
    projected.push({
      numero: cand.numero,
      nomeUrna: cand.nomeUrna,
      pctOficial: cand.pctValidos,
      pctProjetado,
      pctBaixo: clamp(pctProjetado - band, 0, 100),
      pctAlto: clamp(pctProjetado + band, 0, 100),
      inclinacao: incl,
    });
  }

  // Renormaliza projeções para somar ~100 (só candidatos com votos)
  const soma = projected.reduce((s, c) => s + c.pctProjetado, 0);
  if (soma > 0) {
    for (const c of projected) {
      c.pctProjetado = (c.pctProjetado / soma) * 100;
      c.pctBaixo = clamp(c.pctBaixo * (100 / soma), 0, 100);
      c.pctAlto = clamp(c.pctAlto * (100 / soma), 0, 100);
    }
  }

  const first = projected[0];
  const second = projected[1];
  const gapOficial =
    first && second ? first.pctOficial - second.pctOficial : null;
  const gapProjetado =
    first && second ? first.pctProjetado - second.pctProjetado : null;

  let gapAberturaPorPontoSecao: number | null = null;
  if (first && second && window.length >= 2) {
    const xs: number[] = [];
    const gaps: number[] = [];
    for (const p of window) {
      const a = p.candidatos.find((c) => c.numero === first.numero);
      const b = p.candidatos.find((c) => c.numero === second.numero);
      if (!a || !b) continue;
      xs.push(p.pctSecoes);
      gaps.push(a.pctValidos - b.pctValidos);
    }
    if (xs.length >= 2) {
      gapAberturaPorPontoSecao = linReg(xs, gaps).b;
    }
  }

  // Heurística: matematicamente definido se mesmo no cenário extremo
  // (todos os votos restantes para o 2º) o 1º ainda ganha.
  let matematicamenteDefinido = false;
  let podeVirar = true;
  if (first && second && latest.pctSecoes > 0 && latest.pctSecoes < 100) {
    const votosRestantesEstimados =
      latest.votosValidos > 0 && latest.pctSecoes > 0
        ? latest.votosValidos * (remaining / latest.pctSecoes)
        : 0;
    const firstVotes = top[0]!.votos;
    const secondVotes = top[1]!.votos;
    const worstFirst = firstVotes;
    const bestSecond = secondVotes + votosRestantesEstimados;
    matematicamenteDefinido = worstFirst > bestSecond;
    podeVirar = !matematicamenteDefinido && remaining > 0.05;
  } else if (latest.pctSecoes >= 100) {
    matematicamenteDefinido = true;
    podeVirar = false;
  }

  const aberturaTxt =
    gapAberturaPorPontoSecao == null
      ? "abertura ainda instável"
      : gapAberturaPorPontoSecao > 0.02
        ? "abertura aumentando (líder se afastando)"
        : gapAberturaPorPontoSecao < -0.02
          ? "abertura fechando (perseguidor encurtando)"
          : "abertura estável";

  return {
    method: "trajetoria_abertura",
    asOf: latest.coletadoEm,
    pctSecoes: latest.pctSecoes,
    candidatos: projected,
    gapOficial,
    gapProjetado,
    gapAberturaPorPontoSecao,
    matematicamenteDefinido,
    podeVirar,
    nota: `Projeção pela trajetória das linhas no gráfico (${aberturaTxt}). Não é previsão de voto; extrapola o ritmo atual até 100% das seções.`,
  };
}

export function projectLinear(latest: OfficialSnapshot): LinearProjection {
  const factor =
    latest.secoesApuradas > 0 ? latest.secoesTotal / latest.secoesApuradas : 1;
  const candidatos = latest.candidatos.map((c) => {
    const votosProjetados = Math.round(c.votos * factor);
    return { numero: c.numero, votosProjetados, pctProjetado: 0 };
  });
  const total = candidatos.reduce((s, c) => s + c.votosProjetados, 0);
  for (const c of candidatos) {
    c.pctProjetado = total > 0 ? (100 * c.votosProjetados) / total : 0;
  }
  return { method: "linear", candidatos };
}

/** Série sintética de pontos do gráfico até 100% (linha pontilhada). */
export function buildProjectionSeries(
  latest: OfficialSnapshot,
  traj: TrajectoryProjection,
  steps = 12,
): SeriesPoint[] {
  if (latest.pctSecoes >= 99.9) return [];
  const out: SeriesPoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const pctSecoes = latest.pctSecoes + (100 - latest.pctSecoes) * t;
    out.push({
      t: `proj-${i}`,
      pctSecoes,
      candidatos: traj.candidatos.map((c) => ({
        numero: c.numero,
        votos: 0,
        pctValidos: c.pctOficial + (c.pctProjetado - c.pctOficial) * t,
      })),
    });
  }
  return out;
}
