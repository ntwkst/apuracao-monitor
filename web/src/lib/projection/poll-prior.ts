import type { OfficialSnapshot } from "../types";
import type { MethodResult } from "./types";
import { POLL_PRIOR_T2 } from "./types";

/**
 * Mistura prior de pesquisas com o placar oficial.
 * Peso do prior cai linearmente com % seções (100% seções → só oficial).
 */
export function projectPollPriorMethod(
  snap: OfficialSnapshot,
  prior: Record<string, number> = POLL_PRIOR_T2,
): MethodResult {
  const weight = Math.max(0, Math.min(1, 1 - snap.pctSecoes / 100));
  const top = [...snap.candidatos].sort((a, b) => b.votos - a.votos).slice(0, 4);

  const blended = top.map((c) => {
    const p = prior[c.numero];
    const pct =
      p == null ? c.pctValidos : weight * p + (1 - weight) * c.pctValidos;
    return { numero: c.numero, nomeUrna: c.nomeUrna, pctProjetado: pct };
  });

  const sum = blended.reduce((s, c) => s + c.pctProjetado, 0);
  const candidatos = blended
    .map((c) => ({
      ...c,
      pctProjetado: sum > 0 ? (100 * c.pctProjetado) / sum : c.pctProjetado,
    }))
    .sort((a, b) => b.pctProjetado - a.pctProjetado);

  const hasPrior = top.some((c) => prior[c.numero] != null);

  return {
    id: "prior_pesquisas",
    label: "Pesquisas",
    disponivel: hasPrior && top.length > 0,
    motivo: hasPrior ? undefined : "Sem prior cadastrado para estes candidatos",
    lider: candidatos[0]?.numero ?? null,
    candidatos,
    nota: `Prior Palver/GERP/Futura/Veritá misturado ao oficial (peso pesquisa ${(weight * 100).toFixed(0)}%).`,
  };
}
