import cors from "cors";
import express from "express";
import { Store } from "../db/store.js";
import {
  buildProjectionSeries,
  projectByTrajectory,
  projectLinear,
} from "../projection/trajectory.js";
import { DEFAULT_RACES } from "../tse/client.js";

const PORT = Number(process.env.PORT ?? 8787);
const store = new Store();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, races: store.listRaceKeys() });
});

app.get("/api/races", (_req, res) => {
  res.json({
    configured: DEFAULT_RACES,
    withData: store.listRaceKeys(),
  });
});

app.get("/api/apuracao/atual", (req, res) => {
  const raceKey = String(req.query.race ?? DEFAULT_RACES[0]?.raceKey ?? "");
  const latest = store.latest(raceKey);
  if (!latest) {
    res.status(404).json({ error: "sem_snapshot", raceKey });
    return;
  }
  const series = store.series(raceKey);
  const trajetoria = projectByTrajectory(latest, series);
  const linear = projectLinear(latest);
  const projSeries = buildProjectionSeries(latest, trajetoria);
  res.json({
    disponivel: true,
    snapshot: latest,
    projetacao: { trajetoria, linear },
    serieProjecao: projSeries,
  });
});

app.get("/api/apuracao/historico", (req, res) => {
  const raceKey = String(req.query.race ?? DEFAULT_RACES[0]?.raceKey ?? "");
  const desde = req.query.desde ? String(req.query.desde) : undefined;
  const series = store.series(raceKey, desde);
  res.json({ raceKey, pontos: series.length, series });
});

app.get("/api/apuracao/projecao", (req, res) => {
  const raceKey = String(req.query.race ?? DEFAULT_RACES[0]?.raceKey ?? "");
  const latest = store.latest(raceKey);
  if (!latest) {
    res.status(404).json({ error: "sem_snapshot", raceKey });
    return;
  }
  const series = store.series(raceKey);
  res.json({
    trajetoria: projectByTrajectory(latest, series),
    linear: projectLinear(latest),
    serieProjecao: buildProjectionSeries(latest, projectByTrajectory(latest, series)),
  });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[api] http://127.0.0.1:${PORT}`);
});
