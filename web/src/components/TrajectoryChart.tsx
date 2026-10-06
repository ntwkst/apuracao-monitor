import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorFor, type SeriesPoint, type Trajetoria } from "../lib/api";

interface Props {
  series: SeriesPoint[];
  serieProjecao: SeriesPoint[];
  trajetoria: Trajetoria;
}

export function TrajectoryChart({ series, serieProjecao, trajetoria }: Props) {
  const topNums = trajetoria.candidatos.slice(0, 4).map((c) => c.numero);
  const names = new Map(trajetoria.candidatos.map((c) => [c.numero, c.nomeUrna]));

  const rows = [
    ...series.map((p) => {
      const row: Record<string, number | string> = {
        pctSecoes: Number(p.pctSecoes.toFixed(2)),
        tipo: "oficial",
      };
      for (const n of topNums) {
        const hit = p.candidatos.find((c) => c.numero === n);
        row[`o_${n}`] = hit ? Number(hit.pctValidos.toFixed(3)) : NaN;
      }
      return row;
    }),
    ...serieProjecao.map((p) => {
      const row: Record<string, number | string> = {
        pctSecoes: Number(p.pctSecoes.toFixed(2)),
        tipo: "proj",
      };
      for (const n of topNums) {
        const hit = p.candidatos.find((c) => c.numero === n);
        row[`p_${n}`] = hit ? Number(hit.pctValidos.toFixed(3)) : NaN;
      }
      return row;
    }),
  ];

  // Liga a última oficial à primeira projetada (continuidade visual)
  if (series.length && serieProjecao.length) {
    const last = series[series.length - 1]!;
    const bridge: Record<string, number | string> = {
      pctSecoes: Number(last.pctSecoes.toFixed(2)),
      tipo: "bridge",
    };
    for (const n of topNums) {
      const hit = last.candidatos.find((c) => c.numero === n);
      const v = hit ? Number(hit.pctValidos.toFixed(3)) : NaN;
      bridge[`o_${n}`] = v;
      bridge[`p_${n}`] = v;
    }
    const insertAt = series.length;
    rows.splice(insertAt, 0, bridge);
  }

  return (
    <div style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#243049" strokeDasharray="3 3" />
          <XAxis
            dataKey="pctSecoes"
            type="number"
            domain={[0, 100]}
            tick={{ fill: "#9aadc7", fontSize: 12 }}
            label={{ value: "% seções apuradas", position: "insideBottom", offset: -2, fill: "#9aadc7" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#9aadc7", fontSize: 12 }}
            label={{ value: "% votos válidos", angle: -90, position: "insideLeft", fill: "#9aadc7" }}
          />
          <Tooltip
            contentStyle={{ background: "#121a2b", border: "1px solid #243049", borderRadius: 8 }}
            labelFormatter={(v) => `${v}% seções`}
          />
          <Legend />
          <ReferenceLine x={100} stroke="#5b9dff" strokeDasharray="4 4" />
          {topNums.map((n, idx) => (
            <Line
              key={`o-${n}`}
              type="monotone"
              dataKey={`o_${n}`}
              name={names.get(n) ?? n}
              stroke={colorFor(n, idx)}
              dot={false}
              strokeWidth={2.5}
              connectNulls
            />
          ))}
          {topNums.map((n, idx) => (
            <Line
              key={`p-${n}`}
              type="monotone"
              dataKey={`p_${n}`}
              name={`${names.get(n) ?? n} (proj.)`}
              stroke={colorFor(n, idx)}
              dot={false}
              strokeWidth={2}
              strokeDasharray="6 4"
              connectNulls
              legendType="none"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
