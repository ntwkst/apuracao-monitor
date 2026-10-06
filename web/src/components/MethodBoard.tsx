import { colorFor } from "../lib/api";
import type { ConsensusResult, MethodResult } from "../lib/projection";

function shortName(nome: string): string {
  const u = nome.toUpperCase();
  if (u.includes("FLAVIO") || u.includes("FLÁVIO")) return "Flávio";
  if (u.includes("LULA")) return "Lula";
  return nome.split(/\s+/)[0] ?? nome;
}

function MethodCard({ method }: { method: MethodResult }) {
  const top = method.candidatos.slice(0, 2);
  return (
    <article className="method-card">
      <div className="method-card-head">
        <h3>{method.label}</h3>
        <span className={`status-chip ${method.disponivel ? "ok" : "neutral"}`}>
          {method.disponivel ? "Ok" : "Sem dados"}
        </span>
      </div>
      <div className="method-card-body">
        {method.disponivel ? (
          top.map((c, idx) => (
            <div className="method-cand" key={c.numero}>
              <span className="method-cand-name" style={{ color: colorFor(c.numero, idx) }}>
                {shortName(c.nomeUrna)}
              </span>
              <span className="method-cand-pct" style={{ color: colorFor(c.numero, idx) }}>
                {c.pctProjetado.toFixed(1)}%
              </span>
            </div>
          ))
        ) : (
          <p className="method-empty">{method.motivo ?? "Indisponível"}</p>
        )}
      </div>
      <p className="method-note">{method.nota}</p>
    </article>
  );
}

export function MethodBoard({ methods }: { methods: MethodResult[] }) {
  return (
    <section className="method-board" aria-label="Métodos de projeção">
      <div className="panel-head">
        <h2>Métodos</h2>
        <span className="hint">cada card é uma projeção independente</span>
      </div>
      <div className="method-grid">
        {methods.map((m) => (
          <MethodCard key={m.id} method={m} />
        ))}
      </div>
    </section>
  );
}

export function ConsensusCard({ consensus }: { consensus: ConsensusResult }) {
  const a = consensus.pctMedias[0];
  const b = consensus.pctMedias[1];

  return (
    <section className="consensus-card" aria-label="Consenso dos métodos">
      <div className="consensus-banner">
        {consensus.empate ? "Empate entre métodos" : "Previsto a vencer"}
      </div>
      <div className="consensus-body">
        {consensus.empate || !consensus.lider ? (
          <div className="consensus-tie">
            <p className="consensus-title">Sem líder único</p>
            <p className="consensus-sub">{consensus.nota}</p>
          </div>
        ) : (
          <div className="consensus-winner">
            <p
              className="consensus-name"
              style={{ color: colorFor(consensus.lider, consensus.lider === "13" ? 1 : 0) }}
            >
              {shortName(consensus.nomeLider ?? consensus.lider)}
            </p>
            <p className="consensus-sub">
              Consenso <strong>{consensus.placar}</strong> · {consensus.metodosUsados} método(s)
            </p>
          </div>
        )}

        {a && b && (
          <div className="consensus-duel">
            <div>
              <span style={{ color: colorFor(a.numero, 0) }}>{shortName(a.nomeUrna)}</span>
              <strong style={{ color: colorFor(a.numero, 0) }}>{a.pctProjetado.toFixed(1)}%</strong>
            </div>
            <div className="consensus-gap">
              gap méd.
              <strong>
                {consensus.gapMedio == null ? "—" : `${consensus.gapMedio.toFixed(1)} pp`}
              </strong>
            </div>
            <div className="right">
              <span style={{ color: colorFor(b.numero, 1) }}>{shortName(b.nomeUrna)}</span>
              <strong style={{ color: colorFor(b.numero, 1) }}>{b.pctProjetado.toFixed(1)}%</strong>
            </div>
          </div>
        )}

        <div className="consensus-chips">
          {consensus.chips.map((c) => (
            <span
              key={c.id}
              className={`status-chip ${c.ok ? "ok" : "neutral"}`}
              title={c.ok ? `Líder: ${c.lider ?? "—"}` : "Sem dados"}
            >
              {c.label}
              {c.ok ? " ✓" : " —"}
            </span>
          ))}
        </div>
        <p className="panel-note" style={{ marginTop: "0.65rem" }}>
          {consensus.nota} Médias = média aritmética das % projetadas dos métodos disponíveis.
        </p>
      </div>
    </section>
  );
}
