import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const evidence = z.enum(["verified", "self-reported", "unverified"]);
const source = z.object({ label: z.string().min(1), url: z.string().url() });
const relation = z.object({
  target: z.string().regex(/^(paper|model|dataset):[a-z0-9-]+$/),
  type: z.string().min(1),
});
const fact = z.object({
  value: z.number().nullable(),
  unit: z.enum(["billion-parameters", "steps", "trajectories", "episodes", "hours", "tasks", "environments", "embodiments", "percent"]),
  status: evidence,
  source: z.string().url(),
});
const identity = {
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
};
const dated = {
  ...identity,
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().min(1),
};

const papers = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/papers" }),
  schema: z.object({
    ...dated,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    track: z.string().min(1),
    venue: z.string().min(1),
    status: evidence,
    tags: z.array(z.string().min(1)),
    sources: z.array(source).min(1),
    relations: z.array(relation).default([]),
  }),
});

const model = z.object({
  ...dated,
  family: z.string().min(1),
  organization: z.string().min(1),
  license: z.string().min(1),
  protocol: z.string().min(1),
  inputs: z.array(z.string().min(1)).min(1),
  outputs: z.array(z.string().min(1)).min(1),
  facts: z.record(z.string(), fact),
  relations: z.array(relation).default([]),
});

const dataset = z.object({
  ...dated,
  organization: z.string().min(1),
  license: z.string().min(1),
  protocol: z.string().min(1),
  modalities: z.array(z.string().min(1)).min(1),
  facts: z.record(z.string(), fact),
  relations: z.array(relation).default([]),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    ...dated,
    status: z.string().min(1),
    question: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    next: z.string().min(1),
  }),
});

const roadmap = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/roadmap" }),
  schema: z.object({
    ...identity,
    order: z.number().int().positive(),
    label: z.string().min(1),
    duration: z.string().min(1),
    summary: z.string().min(1),
    goals: z.array(z.string().min(1)).min(1),
    outputs: z.array(z.string().min(1)).min(1),
    reading: z.array(z.string().min(1)).min(1),
  }),
});

export const collections = {
  papers,
  models: defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/models" }), schema: model }),
  datasets: defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/datasets" }), schema: dataset }),
  projects,
  roadmap,
};
