import type { ConsensusResult, MethodResult } from "./types";

export function buildConsensus(methods: MethodResult[]): ConsensusResult {
  const usable = methods.filter((m) => m.disponivel && m.lider);
  const votos: Record<string, number> = {};
  const names = new Map<string, string>();

  for (const m of usable) {
    const lider = m.lider!;
    votos[lider] = (votos[lider] ?? 0) + 1;
    const nome = m.candidatos.find((c) => c.numero === lider)?.nomeUrna;
    if (nome) names.set(lider, nome);
  }

  const ranked = Object.entries(votos).sort((a, b) => b[1] - a[1]);
  const topVotes = ranked[0]?.[1] ?? 0;
  const tied = ranked.filter(([, v]) => v === topVotes);
  const empate = tied.length > 1 || usable.length === 0;
  const lider = empate || !ranked[0] ? null : ranked[0][0];

  const placar =
    ranked.length === 0
      ? "—"
      : ranked.map(([, v]) => v).join("–");

  // % média por candidato entre métodos disponíveis
  const byNum = new Map<string, { nome: string; sum: number; n: number }>();
  for (const m of usable) {
    for (const c of m.candidatos) {
      const prev = byNum.get(c.numero) ?? { nome: c.nomeUrna, sum: 0, n: 0 };
      prev.sum += c.pctProjetado;
      prev.n += 1;
      prev.nome = c.nomeUrna;
      byNum.set(c.numero, prev);
    }
  }
  const pctMedias = [...byNum.entries()]
    .map(([numero, v]) => ({
      numero,
      nomeUrna: v.nome,
      pctProjetado: v.n > 0 ? v.sum / v.n : 0,
    }))
    .sort((a, b) => b.pctProjetado - a.pctProjetado);

  const gapMedio =
    pctMedias[0] && pctMedias[1]
      ? pctMedias[0].pctProjetado - pctMedias[1].pctProjetado
      : null;

  const chips = methods.map((m) => ({
    id: m.id,
    label: m.label,
    lider: m.disponivel ? m.lider : null,
    ok: m.disponivel,
  }));

  return {
    empate,
    lider,
    nomeLider: lider ? names.get(lider) ?? lider : null,
    placar,
    votos,
    pctMedias,
    gapMedio,
    metodosUsados: usable.length,
    chips,
    nota: empate
      ? usable.length === 0
        ? "Nenhum método disponível ainda."
        : `Empate entre métodos (${placar}).`
      : `Consenso ${placar}: ${usable.length} método(s) votaram; líder por maioria de votos.`,
  };
}
