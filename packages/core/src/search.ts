/** @format */

// Stop search as you type: uFuzzy over the in-memory stop names.
// Pass 1 matches each typed word's letters in order ("rj ngr" → Raj Nagar);
// pass 2 ignores spaces on both sides ("rajnagar", "rjngr" → Raj Nagar);
// pass 3 tolerates one typo per word ("hapor" → Hapur Chungi) to fill the list.

import uFuzzy from "@leeoniya/ufuzzy";
import type { Stop, StopSearch } from "./types";

export const SEARCH_LIMIT = 8;

const inOrder = new uFuzzy({ intraIns: Infinity });
const oneTypo = new uFuzzy({
  intraMode: 1,
  intraIns: 1,
  intraSub: 1,
  intraTrn: 1,
  intraDel: 1,
});

function ranked(uf: uFuzzy, names: string[], query: string): number[] {
  const [idxs, info, order] = uf.search(names, query);

  if (!idxs) return [];
  if (info && order) return order.map((i) => info.idx[i]!);

  return idxs;
}

const compact = (s: string) => s.replace(/[^a-z0-9]/gi, "");

export function createStopSearch(stops: Stop[]): StopSearch {
  const names = stops.map((s) => s.name);
  const compactNames = names.map(compact);

  return (query, limit = SEARCH_LIMIT) => {
    const q = query.trim();

    if (!q) return [];

    const hits = ranked(inOrder, names, q);
    const fill = (more: number[]) => {
      for (const i of more)
        if (hits.length < limit && !hits.includes(i)) hits.push(i);
    };

    if (hits.length < limit && compact(q))
      fill(ranked(inOrder, compactNames, compact(q)));

    if (hits.length < limit) fill(ranked(oneTypo, names, q));

    return hits.slice(0, limit).map((i) => stops[i]!);
  };
}
