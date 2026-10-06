# Fox Decision Desk — redesign do Apuração Monitor

**Data:** 2026-10-06  
**Status:** aprovado (abordagem A + seção 1)  
**Escopo:** frontend `web/` apenas; lógica live/sim/trajetória intacta.

## Brief

Substituir o kit SaaS dark genérico por um desk de noite de apuração estilo **Fox Decision Desk**: preto/vermelho, tipografia condensada, duel hero, ticker LIVE, densidade de TV.

## Key Decisions

1. **Abordagem A (Fox clássico)** — hierarquia de TV; projeção ao lado do placar, não escondida.
2. **Marca seca** — masthead `APURAÇÃO MONITOR` sem NTWKST.
3. **Desk completo** — rearranjo de layout; sem mapa UF / needle / countdown (YAGNI).
4. **Tokens** — ink `#070708`, panel `#111114`, rule `#2a2a30`, live `#e10600`, paper `#f4f4f5`, dim `#9b9ba3`; candidatos 22 azul / 13 vermelho.
5. **Tipo** — Oswald (display/placar) + IBM Plex Sans (UI).
6. **Motion** — só pulso do ponto LIVE; respeita `prefers-reduced-motion`.
7. **Componentes** — `Masthead`, `DuelHero`, `ProjectionRail`, `Ticker`; `TrajectoryChart` reestilizado; `App` orquestra.

## Layout

```
Masthead (marca · LIVE/SIM · seletor)
DuelHero (% × % · barra gap · seções)
[ gráfico wide | ProjectionRail ]
Ticker
```

Mobile: hero empilha; gráfico full-width; rail abaixo.

## Estados

- **Live com dados:** duel + chart + rail + ticker TSE.
- **Waiting:** masthead + painel standby (sem cards SaaS).
- **Sim:** badge SIMULADO no masthead; faixa de premissa acima do hero; scrubber imediatamente sob o hero; ticker com premissa.
- **Erro:** faixa vermelha sob o masthead.

## Fora de escopo

Mapa, needle, auth, Telegram, mudança de motor de projeção, backend.

## PR Plan

Único PR/commit: redesign visual + spec neste arquivo.
