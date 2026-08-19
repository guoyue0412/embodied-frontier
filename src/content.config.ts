import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const evidence = z.enum(["verified", "self-reported", "unverified"]);
function isRealCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

const httpUrl = z.string().url().refine((value) => {
  try {
    return new Set(["http:", "https:"]).has(new URL(value).protocol);
  } catch {
    return false;
  }
}, { message: "URL must use http or https" });
const calendarDate = z.string().refine(isRealCalendarDate, { message: "date must be YYYY-MM-DD" });
const source = z.object({ label: z.string().min(1), url: httpUrl });
const relation = z.object({
  target: z.string().regex(/^(paper|model|dataset):[a-z0-9-]+$/),
  type: z.string().min(1),
});
const fact = z.object({
  value: z.number().nullable(),
  unit: z.enum(["billion-parameters", "steps", "trajectories", "episodes", "hours", "tasks", "environments", "embodiments", "percent"]),
  status: evidence,
  source: httpUrl,
  missingReason: z.string().min(1).optional(),
});
const identity = {
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
};
const dated = {
  ...identity,
  updated: calendarDate,
  summary: z.string().min(1),
};

const papers = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/papers" }),
  schema: z.object({
    ...dated,
    date: calendarDate,
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
