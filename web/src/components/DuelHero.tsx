import { colorFor } from "../lib/api";
import type { OfficialSnapshot } from "../lib/types";
import type { Trajetoria } from "../lib/api";

interface Props {
  snap: OfficialSnapshot;
  traj: Trajetoria;
}

function shortName(nome: string): string {
  const u = nome.toUpperCase();
  if (u.includes("FLAVIO") || u.includes("FLÁVIO")) return "Flávio";
  if (u.includes("LULA")) return "Lula";
  const parts = nome.trim().split(/\s+/);
  return parts[0] ?? nome;
}

export function DuelHero({ snap, traj }: Props) {
  const top = [...snap.candidatos].sort((a, b) => b.votos - a.votos).slice(0, 2);
  const a = top[0];
  const b = top[1];
  if (!a || !b) return null;

  const sum = a.pctValidos + b.pctValidos;
  const leftW = sum > 0 ? (100 * a.pctValidos) / sum : 50;
  const rightW = 100 - leftW;
  const gap = traj.gapOficial;

  return (
    <section className="duel" aria-label="Placar oficial">
      <div className="duel-row">
        <div className="duel-side left">
          <p className="duel-name" style={{ color: colorFor(a.numero, 0) }}>
            {shortName(a.nomeUrna)}
          </p>
          <div className="duel-num">
            #{a.numero} · {a.votos.toLocaleString("pt-BR")} votos
          </div>
          <p className="duel-pct" style={{ color: colorFor(a.numero, 0) }}>
            {a.pctValidos.toFixed(1)}
            <span style={{ fontSize: "0.45em", marginLeft: "0.08em" }}>%</span>
          </p>
        </div>

        <div className="duel-gap">
          <span className="duel-gap-label">Gap</span>
          <span className="duel-gap-value">
            {gap == null ? "—" : `${gap.toFixed(1)}`}
            {gap != null ? <span style={{ fontSize: "0.7em" }}> pp</span> : null}
          </span>
        </div>

        <div className="duel-side right">
          <p className="duel-name" style={{ color: colorFor(b.numero, 1) }}>
            {shortName(b.nomeUrna)}
          </p>
          <div className="duel-num">
            #{b.numero} · {b.votos.toLocaleString("pt-BR")} votos
          </div>
          <p className="duel-pct" style={{ color: colorFor(b.numero, 1) }}>
            {b.pctValidos.toFixed(1)}
            <span style={{ fontSize: "0.45em", marginLeft: "0.08em" }}>%</span>
          </p>
        </div>
      </div>

      <div className="duel-bar" aria-hidden>
        <div className="duel-bar-seg left" style={{ width: `${leftW}%`, background: colorFor(a.numero, 0) }} />
        <div className="duel-bar-seg right" style={{ width: `${rightW}%`, background: colorFor(b.numero, 1) }} />
      </div>

      <div className="duel-foot">
        <div>
          Seções <strong>{snap.pctSecoes.toFixed(1)}%</strong>
          <div className="secoes-meter" aria-hidden>
            <span style={{ width: `${Math.min(100, snap.pctSecoes)}%` }} />
          </div>
          <div style={{ marginTop: "0.25rem" }}>
            {snap.secoesApuradas.toLocaleString("pt-BR")} /{" "}
            {snap.secoesTotal.toLocaleString("pt-BR")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          Fonte <strong>{snap.fonte.toUpperCase()}</strong>
          <div>
            {new Date(snap.coletadoEm).toLocaleString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              day: "2-digit",
              month: "2-digit",
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
