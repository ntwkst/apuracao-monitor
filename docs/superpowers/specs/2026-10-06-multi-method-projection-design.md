# Multi-method projection desk — Apuração Monitor

**Data:** 2026-10-06  
**Status:** aprovado (abordagem A + seções 1–3)  
**Escopo:** engines de projeção + UI Fox (method cards + consenso) + edge UF + sim UF.

## Brief

Completar o desk de previsão: um card por método e um card grande de **previsto a vencer** por consenso de votos entre os métodos. Hoje só existe trajetória (linhas); o usuário pediu o pacote completo incluindo remanescente geográfico.

## Key Decisions

1. **Abordagem A** — ensemble no cliente; edge só entrega dados (BR + UFs).
2. **Métodos:** trajetória, linear, remanescente UF, prior pesquisas.
3. **Consenso:** 1 voto por método no líder projetado; card grande com placar `N–M`, % média dos métodos que votaram, empate se 2–2.
4. **UF live** via proxy edge (`apuracao-tse`), cache curto; sim gera UFs sintéticas.
5. **Sem município** nesta entrega.
6. **ProjectionRail** permanece âncora da trajetória; method board fica abaixo do split gráfico/rail.
7. Visual Fox Decision Desk (tokens já no ar).

## Methods

| id | Fonte | Ideia |
|---|---|---|
| `trajetoria` | série BR | inclinação + gap → 100% seções |
| `linear` | snapshot BR | escala votos × seções restantes |
| `remanescente_uf` | BR + UFs | votos contados + remanescente por UF (ritmo local) |
| `prior_pesquisas` | constante + oficial | média ~52,35/47,65; peso cai com % seções |

Contrato comum:

```ts
{
  id: string;
  label: string;
  disponivel: boolean;
  motivo?: string;
  lider: string | null; // numero
  candidatos: { numero: string; nomeUrna: string; pctProjetado: number }[];
  nota: string;
}
```

Consenso ignora métodos com `disponivel: false`.

## Layout

```
Masthead · DuelHero · [sim scrubber]
[ TrajectoryChart | ProjectionRail ]
Method board: 4 cards
Consensus card (full width)
Ticker
```

Method card: título + chip OK/SEM DADOS · % dos dois · nota.  
Consensus: faixa live · PREVISTO A VENCER / EMPATE · % médias · placar de votos · chips por método.

## Edge / sim

- Edge: endpoint ou flag que agrega unified JSON por UF (27 + ZZ), cache 20–30s, tolerante a falha parcial.
- Sim: breakdown UF sintético coerente com final das pesquisas e ritmo da noite (Sul/SE cedo Flávio; N/NE depois Lula).

## Fora de escopo

Município, mapa, needle, Telegram, mudança do motor de trajetória em si (só reuso).

## PR Plan

1. Spec (este arquivo).
2. Engines + tipos + consenso no `web/src/lib/projection/`.
3. Edge UF + sim UF.
4. UI MethodBoard + ConsensusCard no desk Fox.
5. Review, build, commit, push.
