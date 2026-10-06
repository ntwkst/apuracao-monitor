# Apuração Monitor

Monitor pessoal da apuração eleitoral brasileira (TSE) com:

1. **Gráfico minuto a minuto** — % de votos válidos de cada candidato ao longo do % de seções (estilo TV).
2. **Projeção pela trajetória / abertura das linhas** — lê a inclinação de cada curva e se o gap entre 1º e 2º está abrindo ou fechando, e extrapola até 100% das seções.
3. Baseline linear e (em seguida) modelo municipal forte.

EUA / Fox News ficam para uma fase posterior (sem API pública estável).

## Subir local

```bash
npm install
npm --prefix web install

# Noite sintética (1º turno 2026) para testar gráfico + projeção
npm run sim

# API
npm run dev

# Em outro terminal: dashboard
npm run web:dev
```

Dashboard: http://localhost:5177  
API: http://localhost:8787

### Coleta ao vivo do TSE

```bash
npm run poller:once   # um ciclo
npm run poller        # loop ~45s
```

Respeita o CDN do TSE (intervalo configurável via `POLL_INTERVAL_MS`).

## Corridas padrão

- `2026-t1-presidente-br` (eleição `6257`)
- `2026-t1-governador-ms` (eleição `6259`)

Ajuste em `src/tse/client.ts` (`DEFAULT_RACES`) para o 2º turno quando o TSE publicar os códigos.

## Disclaimer

A projeção **não prevê voto**. Ela estima o total ao fim da apuração a partir do ritmo atual das linhas e da composição regional que ainda falta. Use com faixa de incerteza.
