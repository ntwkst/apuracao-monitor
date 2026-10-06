import { useEffect, useMemo, useState } from "react";
import { TrajectoryChart } from "./components/TrajectoryChart";
import {
  fetchAtual,
  fetchHistorico,
  fetchRaces,
  type AtualResponse,
  type SeriesPoint,
} from "./lib/api";

export function App() {
  const [race, setRace] = useState("2026-t1-presidente-br");
  const [races, setRaces] = useState<string[]>([]);
  const [atual, setAtual] = useState<AtualResponse | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchRaces()
      .then((r) => {
        const keys = r.withData.length ? r.withData : r.configured.map((c) => c.raceKey);
        setRaces(keys);
        if (keys[0] && !keys.includes(race)) setRace(keys[0]);
      })
      .catch(() => undefined);
  }, [race]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError(null);
        const [a, h] = await Promise.all([fetchAtual(race), fetchHistorico(race)]);
        if (cancelled) return;
        setAtual(a);
        setSeries(h.series);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "falha ao carregar");
        setAtual(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [race]);

  const traj = atual?.projetacao.trajetoria;
  const snap = atual?.snapshot;

  const gapLabel = useMemo(() => {
    if (!traj?.gapAberturaPorPontoSecao && traj?.gapAberturaPorPontoSecao !== 0) {
      return "Abertura: ainda instável";
    }
    const g = traj.gapAberturaPorPontoSecao!;
    if (g > 0.02) return `Abertura aumentando (+${g.toFixed(3)} pp / ponto de seção)`;
    if (g < -0.02) return `Abertura fechando (${g.toFixed(3)} pp / ponto de seção)`;
    return `Abertura estável (${g.toFixed(3)} pp / ponto de seção)`;
  }, [traj]);

  return (
    <>
      <header>
        <div>
          <h1>Apuração Monitor</h1>
          <div className="sub">
            Gráfico minuto a minuto · projeção pela trajetória e abertura das linhas · fonte TSE
          </div>
        </div>
        <label>
          <span className="sub">Corrida&nbsp;</span>
          <select value={race} onChange={(e) => setRace(e.target.value)}>
            {(races.length ? races : [race]).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && (
        <div className="error">
          {error}. Rode <code>npm run sim</code> (noite sintética) ou <code>npm run poller:once</code>{" "}
          (TSE ao vivo) e suba a API com <code>npm run dev</code>.
        </div>
      )}

      {loading && !atual && <div className="sub">Carregando…</div>}

      {snap && traj && (
        <>
          <div className="grid">
            <div className="card">
              <h2>Seções</h2>
              <div className="pct">
                {snap.pctSecoes.toFixed(2)}%
                <small>
                  {snap.secoesApuradas.toLocaleString("pt-BR")} /{" "}
                  {snap.secoesTotal.toLocaleString("pt-BR")}
                </small>
              </div>
            </div>
            <div className="card">
              <h2>Gap oficial</h2>
              <div className="pct">
                {traj.gapOficial == null ? "—" : `${traj.gapOficial.toFixed(2)} pp`}
                <small>projetado: {traj.gapProjetado == null ? "—" : `${traj.gapProjetado.toFixed(2)} pp`}</small>
              </div>
            </div>
            <div className="card">
              <h2>Status</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span className={`badge ${traj.podeVirar ? "warn" : "ok"}`}>
                  {traj.matematicamenteDefinido
                    ? "Matematicamente definido"
                    : traj.podeVirar
                      ? "Ainda pode virar"
                      : "Estável"}
                </span>
                <span className="sub">{gapLabel}</span>
              </div>
            </div>
            <div className="card">
              <h2>Atualizado</h2>
              <div className="pct" style={{ fontSize: "1rem" }}>
                {new Date(snap.coletadoEm).toLocaleString("pt-BR")}
                <small>
                  {snap.fonte === "sim" ? "simulação" : "TSE"} · {snap.geradoEmTse ?? "—"}
                </small>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Gráfico da apuração (% votos × % seções)</h2>
            <TrajectoryChart
              series={series}
              serieProjecao={atual.serieProjecao}
              trajetoria={traj}
            />
            <p className="note">
              Linha cheia = oficial ao longo da noite. Linha pontilhada = extrapolação da
              trajetória até 100% das seções, lendo a inclinação de cada candidato e o quanto a
              abertura entre 1º e 2º está aumentando ou fechando.
            </p>
          </div>

          <div className="panel">
            <h2>Placar e projeção final</h2>
            {traj.candidatos.map((c, idx) => {
              const oficial = snap.candidatos.find((x) => x.numero === c.numero);
              return (
                <div className="cand-row" key={c.numero}>
                  <div>
                    <div className="cand-name">
                      #{idx + 1} {c.nomeUrna}{" "}
                      <span className="cand-meta">({c.numero})</span>
                    </div>
                    <div className="cand-meta">
                      oficial {c.pctOficial.toFixed(2)}% · inclinação{" "}
                      {c.inclinacao >= 0 ? "+" : ""}
                      {c.inclinacao.toFixed(3)} pp/ponto
                    </div>
                  </div>
                  <div className="nums">
                    <div className="proj">{c.pctProjetado.toFixed(2)}% proj.</div>
                    <div className="cand-meta">
                      faixa {c.pctBaixo.toFixed(2)}–{c.pctAlto.toFixed(2)}%
                      {oficial ? ` · ${oficial.votos.toLocaleString("pt-BR")} votos` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="note">{traj.nota}</p>
          </div>
        </>
      )}
    </>
  );
}
