import type { OfficialSnapshot } from "../types";
import type { MethodResult, UfBreakdown } from "./types";

const MIN_UFS = 8;

/**
 * Votos já contados + remanescente por UF no ritmo local atual.
 * UFs sem seção apurada usam a média nacional do snapshot BR.
 */
export function projectRemanescenteUfMethod(
  snap: OfficialSnapshot,
  ufs: UfBreakdown[] | null | undefined,
): MethodResult {
  if (!ufs || ufs.length < MIN_UFS) {
    return {
      id: "remanescente_uf",
      label: "Remanescente UF",
      disponivel: false,
      motivo: ufs?.length
        ? `Poucas UFs (${ufs.length}); mínimo ${MIN_UFS}`
        : "Breakdown por UF indisponível",
      lider: null,
      candidatos: [],
      nota: "Aguarda dados por estado via proxy TSE.",
    };
  }

  const names = new Map(snap.candidatos.map((c) => [c.numero, c.nomeUrna]));
  const projected = new Map<string, number>();
  for (const c of snap.candidatos) projected.set(c.numero, 0);

  let used = 0;
  for (const uf of ufs) {
    if (uf.secoesTotal <= 0) continue;
    const remainingSec = Math.max(0, uf.secoesTotal - uf.secoesApuradas);
    const localTotal = uf.votosValidos || uf.candidatos.reduce((s, c) => s + c.votos, 0);

    if (uf.secoesApuradas > 0 && localTotal > 0) {
      used += 1;
      const votosPorSecao = localTotal / uf.secoesApuradas;
      const remVotes = remainingSec * votosPorSecao;
      for (const c of uf.candidatos) {
        const share = c.votos / localTotal;
        const prev = projected.get(c.numero) ?? 0;
        projected.set(c.numero, prev + c.votos + remVotes * share);
        if (!names.has(c.numero)) names.set(c.numero, c.nomeUrna);
      }
    } else if (remainingSec > 0 && snap.secoesApuradas > 0 && snap.votosValidos > 0) {
      // UF ainda zerada: atribui remanescente pelo share nacional oficial
      used += 1;
      const natPerSec = snap.votosValidos / snap.secoesApuradas;
      const remVotes = remainingSec * natPerSec;
      for (const c of snap.candidatos) {
        const share = c.votos / snap.votosValidos;
        const prev = projected.get(c.numero) ?? 0;
        projected.set(c.numero, prev + remVotes * share);
      }
    } else if (localTotal > 0) {
      used += 1;
      for (const c of uf.candidatos) {
        const prev = projected.get(c.numero) ?? 0;
        projected.set(c.numero, prev + c.votos);
        if (!names.has(c.numero)) names.set(c.numero, c.nomeUrna);
      }
    }
  }

  if (used < MIN_UFS) {
    return {
      id: "remanescente_uf",
      label: "Remanescente UF",
      disponivel: false,
      motivo: `Só ${used} UFs úteis`,
      lider: null,
      candidatos: [],
      nota: "Poucas UFs com seções/votos para extrapolar.",
    };
  }

  const total = [...projected.values()].reduce((s, v) => s + v, 0);
  const candidatos = [...projected.entries()]
    .map(([numero, votos]) => ({
      numero,
      nomeUrna: names.get(numero) ?? numero,
      pctProjetado: total > 0 ? (100 * votos) / total : 0,
    }))
    .sort((a, b) => b.pctProjetado - a.pctProjetado);

  return {
    id: "remanescente_uf",
    label: "Remanescente UF",
    disponivel: candidatos.length > 0,
    lider: candidatos[0]?.numero ?? null,
    candidatos,
    nota: `Soma votos contados + ritmo local em ${used} UFs (seções restantes × votos/seção da UF).`,
  };
}
