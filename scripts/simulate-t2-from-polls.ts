/**
 * Simula noite de apuração do 2º turno Flávio × Lula.
 *
 * Premissas:
 * - Base: resultado oficial 1º turno 2026 (TSE).
 * - Terceira via + cenário de pesquisas (Palver, GERP, Futura, Veritá):
 *   média ~52,35% Flávio / 47,65% Lula nos válidos.
 * - Abstenção 0,7 pp menor que no 1º turno.
 *
 * Gera:
 * - data/sim-t2-meta.json
 * - data/sim-t2-series.json
 * - web/public/sim-t2-series.json (dashboard GitHub Pages)
 */
import fs from "node:fs";
import path from "node:path";

const ELEITORADO = 158_745_502;
const SECOES_TOTAL = 499_248;

// 1º turno (TSE)
const T1 = {
  flavio: 56_104_503,
  lula: 53_879_538,
  validos: 119_300_788,
  comparecimento: 125_275_835,
  abstencaoPct: 100 * (1 - 125_275_835 / ELEITORADO), // ~21.08
};

const TERCEIRA_VIA = T1.validos - T1.flavio - T1.lula; // ~9.316.747

/**
 * Pesquisas nacionais (totais → válidos entre F+L):
 * Palver 29/09: 47/45 → 51,09 / 48,91
 * GERP 29/09: 50/43 → 53,76 / 46,24
 * Futura 30/09: 49/43,5 → 52,97 / 47,03
 * Veritá pós-1º (06/10): 51,56 / 48,44 (já em válidos)
 */
const POLLS_VALIDOS = [
  { nome: "Palver 29/09", flavio: 51.087, lula: 48.913 },
  { nome: "GERP 29/09", flavio: 53.763, lula: 46.237 },
  { nome: "Futura 30/09", flavio: 52.973, lula: 47.027 },
  { nome: "Veritá 06/10", flavio: 51.56, lula: 48.44 },
];

const AVG_F =
  POLLS_VALIDOS.reduce((s, p) => s + p.flavio, 0) / POLLS_VALIDOS.length;
const AVG_L =
  POLLS_VALIDOS.reduce((s, p) => s + p.lula, 0) / POLLS_VALIDOS.length;

const ABSTENCAO_T2 = T1.abstencaoPct - 0.7;
const COMPARECIMENTO_T2 = Math.round(ELEITORADO * (1 - ABSTENCAO_T2 / 100));
// Mesma taxa de válidos/comparecimento do 1º turno (~95,23%)
const TAXA_VALIDOS = T1.validos / T1.comparecimento;
const VALIDOS_T2 = Math.round(COMPARECIMENTO_T2 * TAXA_VALIDOS);

const VOTOS_FLAVIO = Math.round((VALIDOS_T2 * AVG_F) / 100);
const VOTOS_LULA = VALIDOS_T2 - VOTOS_FLAVIO;

/** Quanto da 3ª via + votos “novos” (menor abstenção) foi para cada um. */
function decomposeTransfer() {
  const novos = VALIDOS_T2 - T1.validos;
  // Mantém bases do 1º; o restante (3ª via + novos − quem sai pra BN implícito) fecha o alvo
  const extraF = VOTOS_FLAVIO - T1.flavio;
  const extraL = VOTOS_LULA - T1.lula;
  const pool = TERCEIRA_VIA + Math.max(0, novos);
  return {
    novosVotosValidos: novos,
    terceiraVia: TERCEIRA_VIA,
    extraFlavio: extraF,
    extraLula: extraL,
    shareFlavioDoExtra: extraF / (extraF + extraL),
    poolAproximado: pool,
  };
}

type Point = {
  hora: string;
  minutesFromStart: number;
  pctSecoes: number;
  flavio: number;
  lula: number;
  votosFlavio: number;
  votosLula: number;
  votosValidos: number;
  secoesApuradas: number;
};

/**
 * Noite sintética: Flávio abre maior (Sul/SE rápidos), Lula encurta com NE/Norte,
 * converge para o alvo das pesquisas — espelha o formato do gráfico do 1º turno.
 */
function buildNight(): Point[] {
  const minutes = 200; // 17h → ~20h20 no ritmo típico de 2º turno (mais rápido)
  const points: Point[] = [];
  for (let m = 3; m <= minutes; m += 2) {
    const t = m / minutes;
    // curva de seções: rápida no começo
    const pctSecoes = Math.min(100, 100 * (1 - (1 - t) ** 1.45));
    // viés precoce: Flávio +~3,5 pp no início, some até o alvo
    const remain = Math.exp(-pctSecoes / 32);
    const flavioPct = AVG_F + 3.4 * remain;
    const lulaPct = 100 - flavioPct;
    const votosValidos = Math.round((VALIDOS_T2 * pctSecoes) / 100);
    const votosFlavio = Math.round((votosValidos * flavioPct) / 100);
    const votosLula = votosValidos - votosFlavio;
    const totalMin = 17 * 60 + m;
    const hh = Math.floor(totalMin / 60) % 24;
    const mm = totalMin % 60;
    const hora = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
    points.push({
      hora,
      minutesFromStart: m,
      pctSecoes,
      flavio: (100 * votosFlavio) / votosValidos,
      lula: (100 * votosLula) / votosValidos,
      votosFlavio,
      votosLula,
      votosValidos,
      secoesApuradas: Math.round((SECOES_TOTAL * pctSecoes) / 100),
    });
  }
  // ponto final exato
  points.push({
    hora: "21:30:00",
    minutesFromStart: 270,
    pctSecoes: 100,
    flavio: AVG_F,
    lula: AVG_L,
    votosFlavio: VOTOS_FLAVIO,
    votosLula: VOTOS_LULA,
    votosValidos: VALIDOS_T2,
    secoesApuradas: SECOES_TOTAL,
  });
  return points;
}

function toDashboardSeries(points: Point[]) {
  return points.map((p) => ({
    t: `2026-10-25T${p.hora}.000-03:00`,
    pctSecoes: p.pctSecoes,
    candidatos: [
      {
        numero: "22",
        nomeUrna: "FLAVIO BOLSONARO",
        pctValidos: p.flavio,
        votos: p.votosFlavio,
      },
      {
        numero: "13",
        nomeUrna: "LULA",
        pctValidos: p.lula,
        votos: p.votosLula,
      },
    ],
    secoesApuradas: p.secoesApuradas,
    secoesTotal: SECOES_TOTAL,
    votosValidos: p.votosValidos,
    minutesFromStart: p.minutesFromStart,
    hora: p.hora,
  }));
}

function main() {
  const transfer = decomposeTransfer();
  const points = buildNight();
  const series = toDashboardSeries(points);

  const meta = {
    titulo: "2º turno simulado — Flávio × Lula",
    premisaAbstencao: `Abstenção 1º turno ${T1.abstencaoPct.toFixed(2)}% → 2º turno ${ABSTENCAO_T2.toFixed(2)}% (−0,7 pp)`,
    pesquisas: POLLS_VALIDOS,
    mediaValidos: { flavio: AVG_F, lula: AVG_L },
    totais: {
      eleitorado: ELEITORADO,
      comparecimento: COMPARECIMENTO_T2,
      validos: VALIDOS_T2,
      votosFlavio: VOTOS_FLAVIO,
      votosLula: VOTOS_LULA,
      pctFlavio: AVG_F,
      pctLula: AVG_L,
    },
    transferencia: transfer,
    nota:
      "Simulação didática: média Palver/GERP/Futura/Veritá nos válidos + abstenção −0,7 pp. Não é previsão oficial.",
  };

  fs.mkdirSync(path.resolve("data"), { recursive: true });
  fs.mkdirSync(path.resolve("web/public"), { recursive: true });
  fs.writeFileSync(path.resolve("data/sim-t2-meta.json"), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.resolve("data/sim-t2-series.json"), JSON.stringify(series, null, 2));
  fs.writeFileSync(
    path.resolve("web/public/sim-t2-series.json"),
    JSON.stringify({ meta, series }, null, 2),
  );

  console.log("=== 2º turno simulado ===");
  console.log(meta.premisaAbstencao);
  console.log(
    `Média pesquisas (válidos): Flávio ${AVG_F.toFixed(2)}% · Lula ${AVG_L.toFixed(2)}%`,
  );
  console.log(
    `Votos: F ${VOTOS_FLAVIO.toLocaleString("pt-BR")} · L ${VOTOS_LULA.toLocaleString("pt-BR")} · válidos ${VALIDOS_T2.toLocaleString("pt-BR")}`,
  );
  console.log(
    `Transferência do “extra” (3ª via + novos): ${(transfer.shareFlavioDoExtra * 100).toFixed(1)}% Flávio / ${((1 - transfer.shareFlavioDoExtra) * 100).toFixed(1)}% Lula`,
  );
  console.log(`Pontos na noite: ${series.length}`);
  console.log("Arquivos: data/sim-t2-*.json · web/public/sim-t2-series.json");
}

main();
