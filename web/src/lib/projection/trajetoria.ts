import type { OfficialSnapshot, SeriesPoint } from "../types";
import { projectByTrajectory } from "../trajectory";
import type { MethodResult } from "./types";

export function projectTrajetoriaMethod(
  snap: OfficialSnapshot,
  series: SeriesPoint[],
): MethodResult {
  const t = projectByTrajectory(snap, series);
  const candidatos = t.candidatos
    .map((c) => ({
      numero: c.numero,
      nomeUrna: c.nomeUrna,
      pctProjetado: c.pctProjetado,
    }))
    .sort((a, b) => b.pctProjetado - a.pctProjetado);

  return {
    id: "trajetoria",
    label: "Trajetória",
    disponivel: candidatos.length > 0,
    lider: candidatos[0]?.numero ?? null,
    candidatos,
    nota: t.nota,
  };
}
