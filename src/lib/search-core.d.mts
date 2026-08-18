import type { EvidenceStatus } from "../../lib/content/types";

export interface SearchRecord {
  slug: string;
  title: string;
  summary: string;
  track: string;
  venue: string;
  year: string;
  updated: string;
  status: EvidenceStatus;
  tags: string[];
  haystack: string;
}

export interface SearchFilters {
  query?: string;
  track?: string;
  tag?: string;
  year?: string;
  venue?: string;
  status?: string;
}

export function buildSearchIndex(papers: Array<Record<string, unknown>>): { version: 1; records: SearchRecord[] };
export function searchRecords(records: SearchRecord[], filters?: SearchFilters): SearchRecord[];
export function filtersFromSearchParams(params: URLSearchParams): SearchFilters;
export function filtersToSearchParams(filters: SearchFilters): URLSearchParams;
