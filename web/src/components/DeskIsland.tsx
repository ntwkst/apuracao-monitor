import { useEffect, useState } from "react";
import { useTheme } from "../lib/theme";

function IconSun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
    </svg>
  );
}

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

export function DeskIsland({ raceId, races, onRaceChange, mode, meta }: Props) {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`desk-island${scrolled ? " is-compact" : ""}`}
      role="banner"
      data-dynamic-island-header
    >
      <div className="desk-island-inner">
        <div className="desk-island-brand">
          <span className="desk-island-mark" aria-hidden>
            n
          </span>
          <div className="desk-island-titles">
            <span className="desk-island-name">Apuração Monitor</span>
            {meta ? <span className="desk-island-meta">{meta}</span> : null}
          </div>
          <span className="live-pill" data-mode={mode}>
            <span className="live-dot" aria-hidden />
            {MODE_LABEL[mode]}
          </span>
        </div>

        <div className="desk-island-actions">
          <label className="desk-island-select">
            <span className="sr-only">Corrida</span>
            <select value={raceId} onChange={(e) => onRaceChange(e.target.value)}>
              {races.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="desk-island-theme"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </div>
    </header>
  );
}
