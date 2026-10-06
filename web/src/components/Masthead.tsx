type LiveMode = "live" | "sim" | "wait";

interface Props {
  raceId: string;
  races: { id: string; label: string }[];
  onRaceChange: (id: string) => void;
  mode: LiveMode;
  meta?: string;
}

const MODE_LABEL: Record<LiveMode, string> = {
  live: "Live",
  sim: "Simulado",
  wait: "Standby",
};

export function Masthead({ raceId, races, onRaceChange, mode, meta }: Props) {
  return (
    <header className="masthead">
      <div className="masthead-brand">
        <h1 className="masthead-title">Apuração Monitor</h1>
        <span className="live-pill" data-mode={mode}>
          <span className="live-dot" aria-hidden />
          {MODE_LABEL[mode]}
        </span>
        {meta ? <span className="masthead-meta">{meta}</span> : null}
      </div>
      <div className="masthead-controls">
        <label>
          Corrida
          <select value={raceId} onChange={(e) => onRaceChange(e.target.value)}>
            {races.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
