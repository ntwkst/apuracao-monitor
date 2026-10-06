import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { OfficialSnapshot, SeriesPoint } from "../types.js";

const DEFAULT_DB = path.resolve("data/apuracao.sqlite");

export class Store {
  readonly db: Database.Database;

  constructor(dbPath = process.env.APURACAO_DB ?? DEFAULT_DB) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        race_key TEXT NOT NULL,
        coletado_em TEXT NOT NULL,
        idg TEXT,
        pct_secoes REAL NOT NULL,
        secoes_apuradas INTEGER NOT NULL,
        secoes_total INTEGER NOT NULL,
        votos_validos INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        UNIQUE(race_key, content_hash)
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_race_time
        ON snapshots(race_key, coletado_em);
    `);
  }

  private hashSnapshot(snap: OfficialSnapshot): string {
    const core = {
      idg: snap.idg,
      pct: Math.round(snap.pctSecoes * 1000) / 1000,
      votos: snap.candidatos.map((c) => [c.numero, c.votos]),
    };
    return Buffer.from(JSON.stringify(core)).toString("base64url");
  }

  insertSnapshot(snap: OfficialSnapshot): { inserted: boolean; id: number | null } {
    const contentHash = this.hashSnapshot(snap);
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO snapshots
        (race_key, coletado_em, idg, pct_secoes, secoes_apuradas, secoes_total, votos_validos, payload_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      snap.raceKey,
      snap.coletadoEm,
      snap.idg,
      snap.pctSecoes,
      snap.secoesApuradas,
      snap.secoesTotal,
      snap.votosValidos,
      JSON.stringify(snap),
      contentHash,
    );
    return {
      inserted: info.changes > 0,
      id: info.changes > 0 ? Number(info.lastInsertRowid) : null,
    };
  }

  latest(raceKey: string): OfficialSnapshot | null {
    const row = this.db
      .prepare(
        `SELECT payload_json FROM snapshots WHERE race_key = ? ORDER BY coletado_em DESC, id DESC LIMIT 1`,
      )
      .get(raceKey) as { payload_json: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.payload_json) as OfficialSnapshot;
  }

  series(raceKey: string, sinceIso?: string): SeriesPoint[] {
    const rows = sinceIso
      ? (this.db
          .prepare(
            `SELECT coletado_em, pct_secoes, payload_json FROM snapshots
             WHERE race_key = ? AND coletado_em >= ?
             ORDER BY coletado_em ASC, id ASC`,
          )
          .all(raceKey, sinceIso) as {
          coletado_em: string;
          pct_secoes: number;
          payload_json: string;
        }[])
      : (this.db
          .prepare(
            `SELECT coletado_em, pct_secoes, payload_json FROM snapshots
             WHERE race_key = ?
             ORDER BY coletado_em ASC, id ASC`,
          )
          .all(raceKey) as {
          coletado_em: string;
          pct_secoes: number;
          payload_json: string;
        }[]);

    return rows.map((r) => {
      const snap = JSON.parse(r.payload_json) as OfficialSnapshot;
      return {
        t: r.coletado_em,
        pctSecoes: r.pct_secoes,
        candidatos: snap.candidatos.map((c) => ({
          numero: c.numero,
          pctValidos: c.pctValidos,
          votos: c.votos,
        })),
      };
    });
  }

  listRaceKeys(): string[] {
    const rows = this.db
      .prepare(`SELECT DISTINCT race_key FROM snapshots ORDER BY race_key`)
      .all() as { race_key: string }[];
    return rows.map((r) => r.race_key);
  }
}
