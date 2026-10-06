import type { OfficialSnapshot } from "../types";
import type { MethodResult } from "./types";

export function projectLinearMethod(snap: OfficialSnapshot): MethodResult {
  const factor =
    snap.secoesApuradas > 0 ? snap.secoesTotal / snap.secoesApuradas : 1;
  const raw = snap.candidatos.map((c) => ({
    numero: c.numero,
    nomeUrna: c.nomeUrna,
    votosProjetados: Math.round(c.votos * factor),
  }));
  const total = raw.reduce((s, c) => s + c.votosProjetados, 0);
  const candidatos = raw
    .map((c) => ({
      numero: c.numero,
      nomeUrna: c.nomeUrna,
      pctProjetado: total > 0 ? (100 * c.votosProjetados) / total : 0,
    }))
    .sort((a, b) => b.pctProjetado - a.pctProjetado);

  return {
    id: "linear",
    label: "Linear",
    disponivel: snap.secoesApuradas > 0,
    motivo: snap.secoesApuradas > 0 ? undefined : "Sem seções apuradas",
    lider: candidatos[0]?.numero ?? null,
    candidatos,
    nota: "Escala os votos atuais até 100% das seções (mesmo ritmo nacional).",
  };
}
