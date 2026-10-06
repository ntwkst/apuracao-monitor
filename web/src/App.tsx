import { useCallback, useEffect, useMemo, useState } from "react";
import { ConsensusCard, MethodBoard } from "./components/MethodBoard";
import { DeskIsland } from "./components/DeskIsland";
import { DuelHero } from "./components/DuelHero";
import { ProjectionRail } from "./components/ProjectionRail";
import { Ticker } from "./components/Ticker";
import { TrajectoryChart } from "./components/TrajectoryChart";
import type { Trajetoria } from "./lib/api";
import {
  appendSnapshot,
  fetchConfig,
  fetchLiveSnapshot,
  fetchLiveUfs,
  loadSeries,
} from "./lib/live";
import { runAllMethods, type UfBreakdown } from "./lib/projection";
import {
  buildSimUfBreakdown,
  loadSimT2,
  simPointToSnapshot,
  simRaceKey,
  simSeriesToPoints,
  type SimT2Meta,
  type SimT2Payload,
} from "./lib/sim";
import {
  loadT1Replay,
  t1PointToSnapshot,
  t1SeriesToPoints,
  T1_REPLAY_RACE,
  type T1ReplayMeta,
  type T1ReplayPayload,
} from "./lib/t1-replay";
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
  t1Replay?: boolean;
};

const RACES: RaceOpt[] = [
  {
    id: T1_REPLAY_RACE,
    label: "Presidente · 1º turno REPLAY (LinhaDoTempo)",
    cargo: "presidente",
    turno: 1,
    abrangencia: "BR",
    t1Replay: true,
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
];

export function App() {
  const [raceId, setRaceId] = useState(T1_REPLAY_RACE);
  const race = RACES.find((r) => r.id === raceId) ?? RACES[0]!;
  const [snap, setSnap] = useState<OfficialSnapshot | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [ufs, setUfs] = useState<UfBreakdown[] | null>(null);
  const [waiting, setWaiting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string>("");
  const [tick, setTick] = useState(0);
  const [simPayload, setSimPayload] = useState<SimT2Payload | null>(null);
  const [t1Payload, setT1Payload] = useState<T1ReplayPayload | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);

  const applySimIndex = useCallback((payload: SimT2Payload, index: number) => {
    const clamped = Math.max(0, Math.min(index, payload.series.length - 1));
    const point = payload.series[clamped]!;
    setReplayIndex(clamped);
    setSnap(simPointToSnapshot(point));
    setSeries(simSeriesToPoints(payload.series, clamped));
    setUfs(buildSimUfBreakdown(point.pctSecoes, payload.meta));
    setWaiting(null);
    setError(null);
  }, []);

  const applyT1Index = useCallback((payload: T1ReplayPayload, index: number) => {
    const clamped = Math.max(0, Math.min(index, payload.series.length - 1));
    const point = payload.series[clamped]!;
    setReplayIndex(clamped);
    setSnap(t1PointToSnapshot(point));
    setSeries(t1SeriesToPoints(payload.series, clamped));
    setUfs(null);
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
        setUfs(null);
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

      if (race.cargo === "presidente" && race.abrangencia === "BR") {
        try {
          const ufLive = await fetchLiveUfs({ cargo: "presidente", turno: race.turno });
          setUfs(ufLive.disponivel && ufLive.ufs ? ufLive.ufs : null);
        } catch {
          setUfs(null);
        }
      } else {
        setUfs(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "falha ao atualizar");
    }
  }, [race]);

  useEffect(() => {
    void fetchConfig(2)
      .then((c) => setCodes(`pres=${c.presidente} est=${c.estadual}`))
      .catch(() => setCodes(""));
  }, []);

  useEffect(() => {
    setSnap(null);
    setSeries([]);
    setUfs(null);
    setWaiting(null);
    setError(null);
    setSimPayload(null);
    setT1Payload(null);

    if (race.t1Replay) {
      let cancelled = false;
      void loadT1Replay()
        .then((payload) => {
          if (cancelled) return;
          setT1Payload(payload);
          // começa ~meio da noite (~55%) para já ver linhas + projeção
          const startAt = Math.max(0, Math.floor(payload.series.length * 0.45) - 1);
          applyT1Index(payload, startAt);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "falha ao carregar replay T1");
        });
      return () => {
        cancelled = true;
      };
    }

    if (race.sim) {
      let cancelled = false;
      void loadSimT2()
        .then((payload) => {
          if (cancelled) return;
          setSimPayload(payload);
          const startAt = Math.max(0, Math.floor(payload.series.length * 0.55) - 1);
          applySimIndex(payload, startAt);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "falha ao carregar simulação");
        });
      return () => {
        cancelled = true;
      };
    }

    void refreshLive();
    const id = window.setInterval(() => {
      void refreshLive();
      setTick((t) => t + 1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [race, refreshLive, applySimIndex, applyT1Index]);

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

  const ensemble = useMemo(() => {
    if (!snap) return null;
    // prior T2 só no sim / 2º turno; no replay T1 não aplica 52/47
    const pollPrior = race.t1Replay ? {} : undefined;
    return runAllMethods({ snap, series, ufs, pollPrior });
  }, [snap, series, ufs, race.t1Replay]);

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
  const t1Meta: T1ReplayMeta | null = t1Payload?.meta ?? null;
  const simPoint = simPayload?.series[replayIndex];
  const t1Point = t1Payload?.series[replayIndex];

  const mastMode = race.sim || race.t1Replay ? "sim" : snap ? "live" : "wait";
  const mastMeta = race.t1Replay
    ? "1º turno · replay LinhaDoTempo"
    : race.sim
      ? "2º turno · cenário pesquisas"
      : codes || undefined;

  const tickerTag = race.t1Replay ? "T1" : race.sim ? "SIM" : snap ? "TSE" : "DESK";
  const tickerText = (() => {
    if (error) return error;
    if (race.t1Replay && t1Meta && ensemble) {
      const c = ensemble.consensus;
      return (
        <>
          <strong>
            {t1Point?.hora?.slice(0, 5) ?? "—"} · {t1Point?.pctSecoes.toFixed(1) ?? "—"}% seções
          </strong>
          {" · "}
          {c.empate ? `consenso empate ${c.placar}` : `previsto ${c.nomeLider ?? "—"} (${c.placar})`}
          {" · final real F "}
          {t1Meta.final.flavio.toFixed(2)}% / L {t1Meta.final.lula.toFixed(2)}%
        </>
      );
    }
    if (race.sim && simMeta && ensemble) {
      const c = ensemble.consensus;
      return (
        <>
          <strong>
            {c.empate
              ? `Consenso empate ${c.placar}`
              : `Previsto ${c.nomeLider ?? "—"} · ${c.placar}`}
          </strong>
          {" · "}
          replay {simPoint?.hora?.slice(0, 5) ?? "—"}
        </>
      );
    }
    if (waiting && !snap) {
      return (
        <>
          <strong>Standby 25/10</strong> · {waiting} · tick #{tick}
        </>
      );
    }
    if (snap && ensemble) {
      const c = ensemble.consensus;
      return (
        <>
          <strong>
            {snap.pctSecoes.toFixed(1)}% seções ·{" "}
            {c.empate
              ? `consenso empate ${c.placar}`
              : `previsto ${c.nomeLider ?? "—"} (${c.placar})`}
          </strong>
        </>
      );
    }
    return "Apuração Monitor · NTWKST";
  })();

  return (
    <>
      <DeskIsland
        raceId={raceId}
        races={RACES}
        onRaceChange={setRaceId}
        mode={mastMode}
        meta={mastMeta}
      />

      <div className="desk">
        {error && <p className="desk-error">{error}</p>}

        {race.t1Replay && t1Meta && (
          <div className="sim-strip">
            <h2>{t1Meta.titulo}</h2>
            <p>{t1Meta.nota}</p>
            <p>
              Final oficial: Flávio {t1Meta.final.flavio.toFixed(2)}% · Lula{" "}
              {t1Meta.final.lula.toFixed(2)}% · {t1Meta.pontos} pontos de avanço de seções.
            </p>
          </div>
        )}

        {race.sim && simMeta && (
          <div className="sim-strip">
            <h2>{simMeta.titulo}</h2>
            <p>{simMeta.nota}</p>
            <p>
              {simMeta.premisaAbstencao}. Média válidos Flávio{" "}
              {simMeta.mediaValidos.flavio.toFixed(2)}% · Lula{" "}
              {simMeta.mediaValidos.lula.toFixed(2)}%.
            </p>
          </div>
        )}

        {waiting && !snap && (
          <div className="standby">
            <h2>Decision desk pronto</h2>
            <p>{waiting}</p>
            <p>
              Em 25/10, a partir das 17h (Brasília), o placar e as projeções passam a
              gravar sozinhos nesta aba.
            </p>
            <p>Atualização a cada 30s · tick #{tick}</p>
          </div>
        )}

        {snap && traj && ensemble && (
          <>
            <ConsensusCard consensus={ensemble.consensus} />
            <MethodBoard methods={ensemble.methods} />

            <DuelHero snap={snap} traj={traj} />

            {race.t1Replay && t1Payload && (
              <label className="sim-scrub sim-strip">
                <span className="label">
                  Andamento da apuração · {t1Point?.hora?.slice(0, 5) ?? "—"} ·{" "}
                  {t1Point?.pctSecoes.toFixed(1) ?? "—"}% seções
                  {t1Point?.origem ? ` · ${t1Point.origem}` : ""}
                </span>
                <input
                  type="range"
                  min={0}
                  max={t1Payload.series.length - 1}
                  value={replayIndex}
                  onChange={(e) => applyT1Index(t1Payload, Number(e.target.value))}
                />
              </label>
            )}

            {race.sim && simPayload && (
              <label className="sim-scrub sim-strip">
                <span className="label">
                  Replay / apuração · {simPoint?.hora?.slice(0, 5) ?? "—"} ·{" "}
                  {simPoint?.pctSecoes.toFixed(1) ?? "—"}% seções
                </span>
                <input
                  type="range"
                  min={0}
                  max={simPayload.series.length - 1}
                  value={replayIndex}
                  onChange={(e) => applySimIndex(simPayload, Number(e.target.value))}
                />
              </label>
            )}

            <div className="desk-main">
              <section className="panel-block">
                <div className="panel-head">
                  <h2>Trajetória</h2>
                  <span className="hint">% válidos × % seções · linhas oficiais + projeção</span>
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
                    Cheia = oficial até o momento do scrubber. Pontilhada = o que o sistema
                    projetava para 100% das seções naquele instante.
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
