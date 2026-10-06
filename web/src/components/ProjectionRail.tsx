import { colorFor, type Trajetoria } from "../lib/api";
import type { OfficialSnapshot } from "../lib/types";

interface Props {
  snap: OfficialSnapshot;
  traj: Trajetoria;
  gapLabel: string;
}

export function ProjectionRail({ snap, traj, gapLabel }: Props) {
  const statusLabel = traj.matematicamenteDefinido
    ? "Definido"
    : traj.podeVirar
      ? "Pode virar"
      : "Estável";
  const statusClass = traj.podeVirar ? "warn" : "ok";

  return (
    <aside className="panel-block">
      <div className="panel-head">
        <h2>Projeção final</h2>
        <span className="hint">trajetória × abertura</span>
      </div>
      <div className="panel-body">
        <div className="rail-status">
          <span className={`status-chip ${statusClass}`}>{statusLabel}</span>
          {traj.gapProjetado != null && (
            <span className="status-chip neutral">
              Gap proj. {traj.gapProjetado.toFixed(1)} pp
            </span>
          )}
        </div>

        <div className="cand-stack">
          {traj.candidatos.map((c, idx) => {
            const oficial = snap.candidatos.find((x) => x.numero === c.numero);
            return (
              <div className="cand-block" key={c.numero}>
                <div className="cand-block-top">
                  <div>
                    <div
                      className="cand-block-name"
                      style={{ color: colorFor(c.numero, idx) }}
                    >
                      {c.nomeUrna}
                    </div>
                    <div className="cand-block-meta">
                      oficial {c.pctOficial.toFixed(2)}% · incl.{" "}
                      {c.inclinacao >= 0 ? "+" : ""}
                      {c.inclinacao.toFixed(3)}
                      {oficial
                        ? ` · ${oficial.votos.toLocaleString("pt-BR")} votos`
                        : ""}
                    </div>
                  </div>
                  <div className="cand-proj">
                    <span>Proj.</span>
                    {c.pctProjetado.toFixed(1)}%
                  </div>
                </div>
                <div className="cand-block-meta" style={{ marginTop: "0.35rem" }}>
                  faixa {c.pctBaixo.toFixed(1)}–{c.pctAlto.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>

        <div className="gap-line">
          <strong>{gapLabel}</strong>
          <p className="panel-note" style={{ marginTop: "0.45rem" }}>
            {traj.nota}
          </p>
        </div>
      </div>
    </aside>
  );
}
