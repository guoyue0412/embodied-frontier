export type EvidenceStatus = "verified" | "self-reported" | "unverified";

export interface SourceLink {
  label: string;
  url: string;
}

export interface PaperRecord {
  type: "paper";
  title: string;
  slug: string;
  date: string;
  updated: string;
  track: string;
  venue: string;
  status: EvidenceStatus;
  tags: string[];
  summary: string;
  sources: SourceLink[];
  relations: Relation[];
  text: string;
  html: string;
}

export interface Relation { target: string; type: string }
export interface EvidenceFact { value: number | null; unit: string; status: EvidenceStatus; source: string }

export interface ModelRecord {
  type: "model"; title: string; slug: string; updated: string; family: string;
  organization: string; license: string; protocol: string; summary: string;
  inputs: string[]; outputs: string[]; facts: Record<string, EvidenceFact>;
  relations: Relation[]; html: string;
}

export interface DatasetRecord {
  type: "dataset"; title: string; slug: string; updated: string; organization: string;
  license: string; protocol: string; summary: string; modalities: string[];
  facts: Record<string, EvidenceFact>; relations: Relation[]; html: string;
}

export interface RoadmapRecord {
  type: "roadmap";
  title: string;
  slug: string;
  order: number;
  label: string;
  duration: string;
  summary: string;
  goals: string[];
  outputs: string[];
  reading: string[];
  html: string;
}

export interface ProjectRecord {
  type: "project";
  title: string;
  slug: string;
  updated: string;
  status: string;
  question: string;
  summary: string;
  evidence: string[];
  next: string;
  html: string;
}

export interface ContentCollection {
  papers: PaperRecord[];
  roadmap: RoadmapRecord[];
  projects: ProjectRecord[];
  models: ModelRecord[];
  datasets: DatasetRecord[];
  generatedAt: string;
}
