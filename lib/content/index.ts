import collection from "@/generated/content.json";
import type { ContentCollection, PaperRecord, ProjectRecord, RoadmapRecord } from "./types";

const content = collection as ContentCollection;

export function getPapers(): PaperRecord[] {
  return [...content.papers];
}

export function getPaper(slug: string): PaperRecord | undefined {
  return content.papers.find((paper) => paper.slug === slug);
}

export function getRoadmap(): RoadmapRecord[] {
  return [...content.roadmap];
}

export function getProjects(): ProjectRecord[] {
  return [...content.projects];
}
