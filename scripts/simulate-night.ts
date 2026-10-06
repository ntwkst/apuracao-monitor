/**
 * Gera uma noite sintética de apuração (estilo gráfico TV) a partir do
 * resultado final conhecido do 1º turno 2026, para testar trajetória/abertura.
 *
 * Simula o viés clássico: interior/Norte-Nordeste entram em ritmo diferente
 * do Sudeste, então as % oficiais oscilam até convergir no final.
 */
import { Store } from "../src/db/store.js";
import type { CandidateSnap, OfficialSnapshot } from "../src/types.js";

const RACE = "2026-t1-presidente-br";

/** Resultado final aproximado 1º turno 2026 (TSE). */
const FINAL: { numero: string; nome: string; partido: string; votos: number; pct: number }[] = [
  { numero: "22", nome: "FLAVIO BOLSONARO", partido: "PL", votos: 56_104_503, pct: 47.03 },
  { numero: "13", nome: "LULA", partido: "PT", votos: 53_879_538, pct: 45.16 },
  { numero: "70", nome: "ESCRITOR AUGUSTO CURY", partido: "AVANTE", votos: 3_448_569, pct: 2.89 },
  { numero: "50", nome: "RENAN SANTOS", partido: "MISSÃO", votos: 2_675_887, pct: 2.24 },
  { numero: "55", nome: "RONALDO CAIADO", partido: "PSD", votos: 2_605_148, pct: 2.18 },
];

const SECOES_TOTAL = 499_248;
const VOTOS_VALIDOS_FINAL = FINAL.reduce((s, c) => s + c.votos, 0);

/**
 * % “oficial” no instante: começa com viés (Lula à frente nas primeiras urnas)
 * e converge suavemente para o % final — como o gráfico da TV.
 */
function shareAt(pctSecoes: number, numero: string, finalPct: number): number {
  const remain = Math.exp(-pctSecoes / 28); // cai ~63% aos 28pp de seções
  let offset = 0;
  if (numero === "13") offset = 3.2 * remain;
  if (numero === "22") offset = -2.9 * remain;
  if (numero === "70") offset = -0.15 * remain;
  return Math.max(0.01, finalPct + offset);
}

function buildSnap(pctSecoes: number, minute: number): OfficialSnapshot {
  const secoesApuradas = Math.round((SECOES_TOTAL * pctSecoes) / 100);
  const votosValidos = Math.round((VOTOS_VALIDOS_FINAL * pctSecoes) / 100);

  const weighted = FINAL.map((c) => ({
    ...c,
    w: shareAt(pctSecoes, c.numero, c.pct),
  }));
  const wSum = weighted.reduce((s, c) => s + c.w, 0);

  const candidatos: CandidateSnap[] = weighted
    .map((c) => {
      const votos = Math.round((votosValidos * c.w) / wSum);
      return {
        numero: c.numero,
        sqcand: `sim-${c.numero}`,
        nomeUrna: c.nome,
        partido: c.partido,
        votos,
        pctValidos: votosValidos > 0 ? (100 * votos) / votosValidos : 0,
        situacao: "sim",
        posicao: 0,
      };
    })
    .sort((a, b) => b.votos - a.votos);
  candidatos.forEach((c, i) => {
    c.posicao = i + 1;
  });

  const start = new Date("2026-10-04T20:00:00.000Z");
  start.setUTCMinutes(start.getUTCMinutes() + minute);

  return {
    raceKey: RACE,
    cargo: "presidente",
    abrangencia: "BR",
    eleicaoCodigo: "6257",
    ciclo: "ele2026",
    turno: 1,
    coletadoEm: start.toISOString(),
    geradoEmTse: start.toISOString(),
    idg: `sim-${minute}`,
    secoesTotal: SECOES_TOTAL,
    secoesApuradas,
    pctSecoes,
    votosValidos,
    brancos: 0,
    nulos: 0,
    candidatos,
    fonte: "sim",
  };
}

function main() {
  const store = new Store();
  store.db.prepare(`DELETE FROM snapshots WHERE race_key = ?`).run(RACE);
  // curva de apuração: rápida no começo, desacelera no fim
  const minutes = 180;
  let inserted = 0;
  for (let m = 2; m <= minutes; m += 2) {
    const t = m / minutes;
    const pct = Math.max(0.8, 100 * (1 - (1 - t) ** 1.55));
    const snap = buildSnap(Math.min(100, pct), m);
    const r = store.insertSnapshot(snap);
    if (r.inserted) inserted++;
  }
  // ponto final exato
  const fin = buildSnap(100, minutes + 1);
  for (const c of fin.candidatos) {
    const f = FINAL.find((x) => x.numero === c.numero);
    if (!f) continue;
    c.votos = f.votos;
    c.pctValidos = f.pct;
  }
  fin.votosValidos = VOTOS_VALIDOS_FINAL;
  fin.secoesApuradas = SECOES_TOTAL;
  fin.pctSecoes = 100;
  if (store.insertSnapshot(fin).inserted) inserted++;
  console.log(`[sim] ${inserted} snapshots em data/apuracao.sqlite (race=${RACE})`);
}

main();
