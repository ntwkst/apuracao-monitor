import { useCallback, useEffect, useMemo, useState } from "react";
import { TrajectoryChart } from "./components/TrajectoryChart";
import { colorFor, type Trajetoria } from "./lib/api";
import {
  appendSnapshot,
  fetchConfig,
  fetchLiveSnapshot,
  loadSeries,
} from "./lib/live";
import {
  buildProjectionSeries,
  projectByTrajectory,
} from "./lib/trajectory";
import type { OfficialSnapshot, SeriesPoint } from "./lib/types";

type RaceOpt = {
  id: string;
  label: string;
  cargo: "presidente" | "governador";
  turno: number;
  abrangencia: string;
};

const RACES: RaceOpt[] = [
  {
    id: "2026-t2-presidente-br",
    label: "Presidente · 2º turno (25/10)",
    cargo: "presidente",
    turno: 2,
    abrangencia: "BR",
  },
  {
    id: "2026-t2-governador-rj",
    label: "Governador RJ · 2º turno",
    cargo: "governador",
    turno: 2,
    abrangencia: "RJ",
  },
  {
    id: "2026-t1-presidente-br",
    label: "Presidente · 1º turno (histórico)",
    cargo: "presidente",
    turno: 1,
    abrangencia: "BR",
  },
];

export function App() {
  const [raceId, setRaceId] = useState(RACES[0]!.id);
  const race = RACES.find((r) => r.id === raceId) ?? RACES[0]!;
  const [snap, setSnap] = useState<OfficialSnapshot | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [waiting, setWaiting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string>("");
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const live = await fetchLiveSnapshot({
        cargo: race.cargo,
        turno: race.turno,
        abrangencia: race.abrangencia,
      });
      if (!live.disponivel || !live.snapshot) {
        setSnap(null);
        setWaiting(live.dica ?? live.motivo ?? "Aguardando dados do TSE");
        const hist = await loadSeries(race.id);
        setSeries(hist);
        return;
      }
      // força raceKey estável no cliente
      const snapshot = { ...live.snapshot, raceKey: race.id };
      setSnap(snapshot);
      setWaiting(null);
      await appendSnapshot(snapshot);
      const hist = await loadSeries(race.id);
      setSeries(hist);
    } catch (err) {
      setError(err instanceof Error ? err.message : "falha ao atualizar");
    }
  }, [race]);

  useEffect(() => {
    void fetchConfig(2)
      .then((c) => setCodes(`pres=${c.presidente} est=${c.estadual} (${c.ciclo})`))
      .catch(() => setCodes(""));
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
      setTick((t) => t + 1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const traj = useMemo((): Trajetoria | null => {
    if (!snap) return null;
    const t = projectByTrajectory(snap, series);
    return {
      method: t.method,
      pctSecoes: t.pctSecoes,
      candidatos: t.candidatos,
      gapOficial: t.gapOficial,
      gapProjetado: t.gapProjetado,
      gapAberturaPorPontoSecao: t.gapAberturaPorPontoSecao,
      matematicamenteDefinido: t.matematicamenteDefinido,
      podeVirar: t.podeVirar,
      nota: t.nota,
    };
  }, [snap, series]);

  const serieProjecao = useMemo(() => {
    if (!snap || !traj) return [];
    return buildProjectionSeries(snap, projectByTrajectory(snap, series));
  }, [snap, traj, series]);

  const gapLabel = useMemo(() => {
    if (!traj || traj.gapAberturaPorPontoSecao == null) return "Abertura: ainda instável";
    const g = traj.gapAberturaPorPontoSecao;
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
            Gráfico minuto a minuto · projeção pela abertura das linhas · TSE ao vivo
            {codes ? ` · códigos ${codes}` : ""}
          </div>
        </div>
        <label>
          <span className="sub">Corrida&nbsp;</span>
          <select value={raceId} onChange={(e) => setRaceId(e.target.value)}>
            {RACES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && <div className="error">{error}</div>}

      {waiting && !snap && (
        <div className="panel">
          <h2>Dashboard pronta para o 2º turno</h2>
          <p className="note" style={{ marginTop: 0 }}>
            {waiting}
          </p>
          <p className="note">
            Em 25/10, a partir das 17h (horário de Brasília), esta página passa a gravar sozinha o
            placar minuto a minuto e a projetar o % final pela trajetória das linhas. Deixe a aba
            aberta — não precisa rodar nada no computador.
          </p>
          <p className="sub">Atualização automática a cada 30s · tick #{tick}</p>
        </div>
      )}

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
                <small>
                  projetado:{" "}
                  {traj.gapProjetado == null ? "—" : `${traj.gapProjetado.toFixed(2)} pp`}
                </small>
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
                  {snap.fonte} · {snap.geradoEmTse ?? "—"}
                </small>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Gráfico da apuração (% votos × % seções)</h2>
            {series.length < 2 ? (
              <p className="note">
                Coletando pontos para o gráfico… em alguns minutos a trajetória aparece. Pontos
                nesta sessão: {series.length}.
              </p>
            ) : (
              <TrajectoryChart series={series} serieProjecao={serieProjecao} trajetoria={traj} />
            )}
            <p className="note">
              Linha cheia = oficial. Linha pontilhada = extrapolação até 100% das seções pela
              inclinação e pela abertura entre 1º e 2º. Cor de referência:{" "}
              <span style={{ color: colorFor("22", 0) }}>22</span> /{" "}
              <span style={{ color: colorFor("13", 1) }}>13</span>.
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
