/**
 * Replay da LinhaDoTempo real do 1º turno 2026 (planilha turicas / TSE)
 * no motor de projeção por trajetória/abertura.
 *
 * Pré-req: data/linha-do-tempo-t1-2026.json (gerado a partir da planilha).
 * Uso: npx tsx scripts/replay-t1-accuracy.ts
 */
import fs from "node:fs";
import path from "node:path";
import { projectByTrajectory } from "../src/projection/trajectory.js";
import type { CandidateSnap, OfficialSnapshot, SeriesPoint } from "../src/types.js";

const JSON_PATH = path.resolve("data/linha-do-tempo-t1-2026.json");
const FINAL = { flavio: 47.03, lula: 45.16 };
const SECOES_TOTAL = 499_248;

type Row = {
  hora: string;
  minutesFromStart: number;
  pctSecoes: number;
  flavio: number;
  lula: number;
  curY: number;
  renan: number;
  caiado: number;
  origem: string;
};

function loadSeries(): Row[] {
  const rows = JSON.parse(fs.readFileSync(JSON_PATH, "utf8")) as Row[];
  // só avanços de seções para a regressão não ficar presa em platôs
  const adv: Row[] = [];
  let last = -1;
  for (const r of rows) {
    if (r.pctSecoes > last + 0.001) {
      adv.push(r);
      last = r.pctSecoes;
    }
  }
  return adv;
}

function toSnapshot(r: Row, raceKey: string): OfficialSnapshot {
  const secoesApuradas = Math.round((SECOES_TOTAL * r.pctSecoes) / 100);
  // votos relativos só para ordenação; % oficiais vêm do CSV
  const parts: { numero: string; nome: string; partido: string; pct: number }[] = [
    { numero: "22", nome: "FLAVIO BOLSONARO", partido: "PL", pct: r.flavio },
    { numero: "13", nome: "LULA", partido: "PT", pct: r.lula },
    { numero: "70", nome: "ESCRITOR AUGUSTO CURY", partido: "AVANTE", pct: r.curY },
    { numero: "14", nome: "RENAN SANTOS", partido: "MISSÃO", pct: r.renan },
    { numero: "55", nome: "RONALDO CAIADO", partido: "PSD", pct: r.caiado },
  ];
  // votos fictícios coerentes com % (base 1e6 * pctSecoes)
  const base = Math.max(1, Math.round(1_000_000 * (r.pctSecoes / 100)));
  const candidatos: CandidateSnap[] = parts
    .map((p) => ({
      numero: p.numero,
      sqcand: `r-${p.numero}`,
      nomeUrna: p.nome,
      partido: p.partido,
      votos: Math.round((base * p.pct) / 100),
      pctValidos: p.pct,
      situacao: "parcial",
      posicao: 0,
    }))
    .sort((a, b) => b.votos - a.votos);
  candidatos.forEach((c, i) => {
    c.posicao = i + 1;
  });
  const votosValidos = candidatos.reduce((s, c) => s + c.votos, 0);
  const day = r.minutesFromStart >= 7 * 60 ? "2026-10-05" : "2026-10-04";
  const coletadoEm = `${day}T${r.hora}.000-03:00`;

  return {
    raceKey,
    cargo: "presidente",
    abrangencia: "BR",
    eleicaoCodigo: "6257",
    ciclo: "ele2026",
    turno: 1,
    coletadoEm,
    geradoEmTse: coletadoEm,
    idg: `${r.hora}-${r.pctSecoes}`,
    secoesTotal: SECOES_TOTAL,
    secoesApuradas,
    pctSecoes: r.pctSecoes,
    votosValidos,
    brancos: 0,
    nulos: 0,
    candidatos,
    fonte: "tse",
  };
}

type Hit = {
  label: string;
  row: Row;
  projF: number;
  projL: number;
};

function main() {
  const seriesRows = loadSeries();
  console.log(`Pontos na série (avanços de seções, preferindo Soma UFs): ${seriesRows.length}`);
  console.log(
    `Início dados: ${seriesRows[0]?.hora} (${seriesRows[0]?.minutesFromStart.toFixed(1)} min após 17h) · ${seriesRows[0]?.pctSecoes}% seções`,
  );
  console.log(
    `Fim: ${seriesRows.at(-1)?.hora} · ${seriesRows.at(-1)?.pctSecoes}% · F ${seriesRows.at(-1)?.flavio}% L ${seriesRows.at(-1)?.lula}%`,
  );
  console.log("");

  const raceKey = "replay-t1-2026";
  const series: SeriesPoint[] = [];
  const snaps: OfficialSnapshot[] = [];

  let firstWinnerCorrect: Hit | null = null;
  let firstWithin1: Hit | null = null;
  let firstWithin05: Hit | null = null;
  let firstWithin02: Hit | null = null;
  let lockWinner: Hit | null = null;
  let lockWithin1: Hit | null = null;

  // estabilidade: a partir de i, todos os pontos seguintes satisfazem
  const winnerOk: boolean[] = [];
  const within1Ok: boolean[] = [];

  for (let i = 0; i < seriesRows.length; i++) {
    const r = seriesRows[i]!;
    const snap = toSnapshot(r, raceKey);
    snaps.push(snap);
    series.push({
      t: snap.coletadoEm,
      pctSecoes: snap.pctSecoes,
      candidatos: snap.candidatos.map((c) => ({
        numero: c.numero,
        pctValidos: c.pctValidos,
        votos: c.votos,
      })),
    });

    const traj = projectByTrajectory(snap, series);
    const f = traj.candidatos.find((c) => c.numero === "22");
    const l = traj.candidatos.find((c) => c.numero === "13");
    if (!f || !l) continue;

    const hit: Hit = {
      label: `${r.hora} · ${r.pctSecoes.toFixed(2)}% seções · ${r.minutesFromStart.toFixed(0)} min`,
      row: r,
      projF: f.pctProjetado,
      projL: l.pctProjetado,
    };

    const winnerCorrect = f.pctProjetado > l.pctProjetado;
    const w1 = Math.abs(f.pctProjetado - FINAL.flavio) <= 1 && Math.abs(l.pctProjetado - FINAL.lula) <= 1;
    const w05 =
      Math.abs(f.pctProjetado - FINAL.flavio) <= 0.5 && Math.abs(l.pctProjetado - FINAL.lula) <= 0.5;
    const w02 =
      Math.abs(f.pctProjetado - FINAL.flavio) <= 0.2 && Math.abs(l.pctProjetado - FINAL.lula) <= 0.2;

    winnerOk.push(winnerCorrect);
    within1Ok.push(w1);

    if (winnerCorrect && !firstWinnerCorrect) firstWinnerCorrect = hit;
    if (w1 && !firstWithin1) firstWithin1 = hit;
    if (w05 && !firstWithin05) firstWithin05 = hit;
    if (w02 && !firstWithin02) firstWithin02 = hit;
  }

  function firstStable(flags: boolean[]): number {
    for (let i = 0; i < flags.length; i++) {
      if (flags.slice(i).every(Boolean)) return i;
    }
    return -1;
  }

  const iWin = firstStable(winnerOk);
  const i1 = firstStable(within1Ok);
  if (iWin >= 0) {
    const r = seriesRows[iWin]!;
    const traj = projectByTrajectory(snaps[iWin]!, series.slice(0, iWin + 1));
    const f = traj.candidatos.find((c) => c.numero === "22")!;
    const l = traj.candidatos.find((c) => c.numero === "13")!;
    lockWinner = {
      label: `${r.hora} · ${r.pctSecoes.toFixed(2)}% · ${r.minutesFromStart.toFixed(0)} min`,
      row: r,
      projF: f.pctProjetado,
      projL: l.pctProjetado,
    };
  }
  if (i1 >= 0) {
    const r = seriesRows[i1]!;
    const traj = projectByTrajectory(snaps[i1]!, series.slice(0, i1 + 1));
    const f = traj.candidatos.find((c) => c.numero === "22")!;
    const l = traj.candidatos.find((c) => c.numero === "13")!;
    lockWithin1 = {
      label: `${r.hora} · ${r.pctSecoes.toFixed(2)}% · ${r.minutesFromStart.toFixed(0)} min`,
      row: r,
      projF: f.pctProjetado,
      projL: l.pctProjetado,
    };
  }

  function printHit(title: string, h: Hit | null) {
    if (!h) {
      console.log(`${title}: (não atingido)`);
      return;
    }
    console.log(`${title}:`);
    console.log(`  horário TSE: ${h.row.hora}`);
    console.log(`  minutos após 17h: ${h.row.minutesFromStart.toFixed(1)}`);
    console.log(`  % seções: ${h.row.pctSecoes.toFixed(2)}%`);
    console.log(
      `  oficial na hora: F ${h.row.flavio.toFixed(2)}% · L ${h.row.lula.toFixed(2)}% (gap ${(h.row.flavio - h.row.lula).toFixed(2)})`,
    );
    console.log(
      `  projeção:        F ${h.projF.toFixed(2)}% · L ${h.projL.toFixed(2)}% (gap ${(h.projF - h.projL).toFixed(2)})`,
    );
    console.log(`  final real:      F ${FINAL.flavio}% · L ${FINAL.lula}%`);
    console.log(`  origem: ${h.row.origem}`);
  }

  console.log("=== Critérios (projeção por trajetória/abertura) ===\n");
  printHit("1) Primeira vez: vencedor projetado = Flávio", firstWinnerCorrect);
  console.log("");
  printHit("2) Primeira vez: |proj − final| ≤ 1,0 pp (F e L)", firstWithin1);
  console.log("");
  printHit("3) Primeira vez: |proj − final| ≤ 0,5 pp", firstWithin05);
  console.log("");
  printHit("4) Primeira vez: |proj − final| ≤ 0,2 pp", firstWithin02);
  console.log("");
  printHit("5) TRAVA: vencedor correto até o fim (não volta atrás)", lockWinner);
  console.log("");
  printHit("6) TRAVA: dentro de 1 pp até o fim", lockWithin1);

  // tabela resumida a cada ~10% seções
  console.log("\n=== Amostra ao longo da noite ===");
  console.log(
    "hora   | %sec | ofic F/L     | proj F/L     | err F/L   | líder proj",
  );
  let next = 10;
  for (let i = 0; i < seriesRows.length; i++) {
    const r = seriesRows[i]!;
    if (r.pctSecoes < next && r.pctSecoes < 99.5) continue;
    const traj = projectByTrajectory(snaps[i]!, series.slice(0, i + 1));
    const f = traj.candidatos.find((c) => c.numero === "22")!;
    const l = traj.candidatos.find((c) => c.numero === "13")!;
    const leader = f.pctProjetado >= l.pctProjetado ? "FLAVIO" : "LULA";
    console.log(
      `${r.hora} | ${r.pctSecoes.toFixed(1).padStart(5)} | ${r.flavio.toFixed(2)}/${r.lula.toFixed(2)} | ${f.pctProjetado.toFixed(2)}/${l.pctProjetado.toFixed(2)} | ${(f.pctProjetado - FINAL.flavio).toFixed(2)}/${(l.pctProjetado - FINAL.lula).toFixed(2)} | ${leader}`,
    );
    next += 10;
    if (r.pctSecoes >= 99.5) break;
  }

  // JSON summary for dashboard/report
  const summary = {
    fonte: "LinhaDoTempo turicas (TSE), preferindo Soma UFs",
    final: FINAL,
    firstWinnerCorrectMin: firstWinnerCorrect?.row.minutesFromStart ?? null,
    firstWithin1Min: firstWithin1?.row.minutesFromStart ?? null,
    firstWithin05Min: firstWithin05?.row.minutesFromStart ?? null,
    lockWinnerMin: lockWinner?.row.minutesFromStart ?? null,
    lockWithin1Min: lockWithin1?.row.minutesFromStart ?? null,
    firstWinnerCorrect,
    firstWithin1,
    lockWinner,
    lockWithin1,
  };
  fs.writeFileSync(
    path.resolve("data/replay-t1-accuracy.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log("\nSalvo: data/replay-t1-accuracy.json");
}

main();
