import type { OfficialSnapshot, SeriesPoint } from "../types";
import { buildConsensus } from "./consensus";
import { projectLinearMethod } from "./linear";
import { projectPollPriorMethod } from "./poll-prior";
import { projectRemanescenteUfMethod } from "./remanescente-uf";
import { projectTrajetoriaMethod } from "./trajetoria";
import type { ConsensusResult, MethodResult, UfBreakdown } from "./types";
import { POLL_PRIOR_T2 } from "./types";

export type { ConsensusResult, MethodResult, UfBreakdown } from "./types";
export { POLL_PRIOR_T2 } from "./types";

export function runAllMethods(opts: {
  snap: OfficialSnapshot;
  series: SeriesPoint[];
  ufs?: UfBreakdown[] | null;
  pollPrior?: Record<string, number>;
}): { methods: MethodResult[]; consensus: ConsensusResult } {
  const methods: MethodResult[] = [
    projectTrajetoriaMethod(opts.snap, opts.series),
    projectLinearMethod(opts.snap),
    projectRemanescenteUfMethod(opts.snap, opts.ufs),
    projectPollPriorMethod(opts.snap, opts.pollPrior ?? POLL_PRIOR_T2),
  ];
  return { methods, consensus: buildConsensus(methods) };
}
