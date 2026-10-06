import { useCallback, useEffect, useMemo, useState } from "react";
import { DuelHero } from "./components/DuelHero";
import { Masthead } from "./components/Masthead";
import { ProjectionRail } from "./components/ProjectionRail";
import { Ticker } from "./components/Ticker";
import { TrajectoryChart } from "./components/TrajectoryChart";
import type { Trajetoria } from "./lib/api";
import {
  appendSnapshot,
  fetchConfig,
  fetchLiveSnapshot,
  loadSeries,
} from "./lib/live";
import {
  loadSimT2,
  simPointToSnapshot,
  simRaceKey,
  simSeriesToPoints,
  type SimT2Meta,
  type SimT2Payload,
} from "./lib/sim";
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
  sim?: boolean;
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
    id: simRaceKey(),
    label: "Presidente · 2º turno SIMULADO (pesquisas)",
    cargo: "presidente",
    turno: 2,
    abrangencia: "BR",
    sim: true,
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
  const [simPayload, setSimPayload] = useState<SimT2Payload | null>(null);
  const [simIndex, setSimIndex] = useState(0);

  const applySimIndex = useCallback((payload: SimT2Payload, index: number) => {
    const clamped = Math.max(0, Math.min(index, payload.series.length - 1));
    const point = payload.series[clamped]!;
    setSimIndex(clamped);
    setSnap(simPointToSnapshot(point));
    setSeries(simSeriesToPoints(payload.series, clamped));
    setWaiting(null);
    setError(null);
  }, []);

  const refreshLive = useCallback(async () => {
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
    setSnap(null);
    setSeries([]);
    setWaiting(null);
    setError(null);

    if (race.sim) {
      let cancelled = false;
      void loadSimT2()
        .then((payload) => {
          if (cancelled) return;
          setSimPayload(payload);
          const startAt = Math.max(
            0,
            Math.floor(payload.series.length * 0.55) - 1,
          );
          applySimIndex(payload, startAt);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "falha ao carregar simulação");
          setSnap(null);
          setSeries([]);
        });
      return () => {
        cancelled = true;
      };
    }

    setSimPayload(null);
    void refreshLive();
    const id = window.setInterval(() => {
      void refreshLive();
      setTick((t) => t + 1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [race, refreshLive, applySimIndex]);

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

  const simMeta: SimT2Meta | null = simPayload?.meta ?? null;
  const simPoint = simPayload?.series[simIndex];

  const mastMode = race.sim ? "sim" : snap ? "live" : "wait";
  const mastMeta = race.sim
    ? "2º turno · cenário pesquisas"
    : codes
      ? codes
      : undefined;

  const tickerTag = race.sim ? "SIM" : snap ? "TSE" : "DESK";
  const tickerText = (() => {
    if (error) return error;
    if (race.sim && simMeta) {
      return (
        <>
          <strong>
            Flávio {simMeta.mediaValidos.flavio.toFixed(2)}% · Lula{" "}
            {simMeta.mediaValidos.lula.toFixed(2)}%
          </strong>
          {" · "}
          {simMeta.premisaAbstencao}
          {" · "}
          replay {simPoint?.hora?.slice(0, 5) ?? "—"}
        </>
      );
    }
    if (waiting && !snap) {
      return (
        <>
          <strong>Standby 25/10</strong> · {waiting} · poll 30s · tick #{tick}
        </>
      );
    }
    if (snap) {
      return (
        <>
          <strong>
            {snap.pctSecoes.toFixed(1)}% seções · gap{" "}
            {traj?.gapOficial == null ? "—" : `${traj.gapOficial.toFixed(1)} pp`}
          </strong>
          {" · linha cheia oficial · pontilhada projeção até 100%"}
        </>
      );
    }
    return "Apuração Monitor";
  })();

  return (
    <>
      <Masthead
        raceId={raceId}
        races={RACES}
        onRaceChange={setRaceId}
        mode={mastMode}
        meta={mastMeta}
      />

      <div className="desk">
        {error && <p className="desk-error">{error}</p>}

        {race.sim && simMeta && (
          <div className="sim-strip">
            <h2>{simMeta.titulo}</h2>
            <p>{simMeta.nota}</p>
            <p>
              {simMeta.premisaAbstencao}. Média válidos Flávio{" "}
              {simMeta.mediaValidos.flavio.toFixed(2)}% · Lula{" "}
              {simMeta.mediaValidos.lula.toFixed(2)}%. Extra (3ª via + novos): ~
              {(simMeta.transferencia.shareFlavioDoExtra * 100).toFixed(0)}% Flávio.
            </p>
          </div>
        )}

        {waiting && !snap && (
          <div className="standby">
            <h2>Decision desk pronto</h2>
            <p>{waiting}</p>
            <p>
              Em 25/10, a partir das 17h (Brasília), o placar e a projeção por trajetória
              passam a gravar sozinhos nesta aba — sem rodar nada no computador.
            </p>
            <p>Atualização a cada 30s · tick #{tick}</p>
          </div>
        )}

        {snap && traj && (
          <>
            <DuelHero snap={snap} traj={traj} />

            {race.sim && simPayload && (
              <label className="sim-scrub sim-strip">
                <span className="label">
                  Replay · {simPoint?.hora?.slice(0, 5) ?? "—"} ·{" "}
                  {simPoint?.pctSecoes.toFixed(1) ?? "—"}% seções
                </span>
                <input
                  type="range"
                  min={0}
                  max={simPayload.series.length - 1}
                  value={simIndex}
                  onChange={(e) => applySimIndex(simPayload, Number(e.target.value))}
                />
              </label>
            )}

            <div className="desk-main">
              <section className="panel-block">
                <div className="panel-head">
                  <h2>Trajetória</h2>
                  <span className="hint">% válidos × % seções</span>
                </div>
                <div className="panel-body">
                  {series.length < 2 ? (
                    <p className="panel-note" style={{ marginTop: 0 }}>
                      Coletando pontos para o gráfico… {series.length} nesta sessão.
                    </p>
                  ) : (
                    <TrajectoryChart
                      series={series}
                      serieProjecao={serieProjecao}
                      trajetoria={traj}
                    />
                  )}
                  <p className="panel-note">
                    Cheia = oficial. Pontilhada = extrapolação até 100% das seções.
                  </p>
                </div>
              </section>

              <ProjectionRail snap={snap} traj={traj} gapLabel={gapLabel} />
            </div>
          </>
        )}
      </div>

      <Ticker tag={tickerTag} text={tickerText} />
    </>
  );
}
