# Apuração Monitor

Dashboard pessoal da apuração eleitoral (TSE) com gráfico minuto a minuto e projeção do % final pela **trajetória / abertura das linhas**.

## Abrir (sem rodar nada)

**https://ntwkst.github.io/apuracao-monitor/**

- Já aponta para o **2º turno** (presidente `6258`, estaduais `6260`).
- Enquanto o TSE não publicar o arquivo do dia 25/10, a página mostra “dashboard pronta”.
- Com a aba aberta na noite da apuração, coleta sozinha a cada 30s (histórico no navegador) e projeta o final.

Proxy: edge function `apuracao-tse` no Supabase site-ntwkst.

## Dev local (opcional)

```bash
npm install && npm --prefix web install
# API local + simulação (só se quiser testar offline)
npm run sim && npm run dev
# Dashboard (base / para local):
VITE_BASE=/ npm --prefix web run dev
```

## Códigos TSE 2026

| Cargo | 1º turno | 2º turno (cdt2) |
|-------|----------|-----------------|
| Presidente (federal) | 6257 | **6258** |
| Governador (estadual) | 6259 | **6260** |

MS elegeu governador no 1º turno (Riedel); 2º turno de governador só onde houver disputa (ex.: RJ).
