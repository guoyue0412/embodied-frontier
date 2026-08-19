import index from "../generated/search-index.json";
import type { SearchRecord } from "../src/lib/search-core.mjs";

export function getSearchIndex(): SearchRecord[] {
  return [...(index.records as SearchRecord[])];
}
