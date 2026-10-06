import {
  CartesianGrid,
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

const GRID = "hsl(217 20% 45% / 0.35)";
const MUTED = "hsl(215 15% 50%)";
const TIP_BG = "hsl(var(--card))";
const TIP_FG = "hsl(var(--foreground))";
const TIP_BORDER = "hsl(var(--border))";

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
    rows.splice(series.length, 0, bridge);
  }

  return (
    <div style={{ width: "100%", height: 340 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 10, right: 8, left: -8, bottom: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="pctSecoes"
            type="number"
            domain={[0, 100]}
            tick={{ fill: MUTED, fontSize: 11, fontFamily: "Inter, system-ui, sans-serif" }}
            axisLine={{ stroke: GRID }}
            tickLine={{ stroke: GRID }}
            label={{
              value: "% seções",
              position: "insideBottom",
              offset: -2,
              fill: MUTED,
              fontSize: 11,
            }}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: MUTED, fontSize: 11, fontFamily: "Inter, system-ui, sans-serif" }}
            axisLine={{ stroke: GRID }}
            tickLine={{ stroke: GRID }}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: TIP_BG,
              color: TIP_FG,
              border: `1px solid ${TIP_BORDER}`,
              borderRadius: 12,
              fontSize: 12,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
            labelFormatter={(v) => `${v}% seções`}
          />
          <ReferenceLine x={100} stroke="hsl(200 95% 40%)" strokeDasharray="3 3" strokeOpacity={0.75} />
          {topNums.map((n, idx) => (
            <Line
              key={`o-${n}`}
              type="monotone"
              dataKey={`o_${n}`}
              name={names.get(n) ?? n}
              stroke={colorFor(n, idx)}
              dot={false}
              strokeWidth={2.75}
              connectNulls
            />
          ))}
          {topNums.map((n, idx) => (
            <Line
              key={`p-${n}`}
              type="monotone"
              dataKey={`p_${n}`}
              name={`${names.get(n) ?? n} proj.`}
              stroke={colorFor(n, idx)}
              dot={false}
              strokeWidth={2}
              strokeDasharray="5 4"
              connectNulls
              legendType="none"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
