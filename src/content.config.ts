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

const demoVideoAsset = z.string().regex(/^\/videos\/[a-z0-9/_-]+\.(?:webm|mp4)$/);
const demoPosterAsset = z.string().regex(/^\/videos\/[a-z0-9/_-]+\.(?:webp|avif|jpg|jpeg|png)$/);
const demoCaptionAsset = z.string().regex(/^\/videos\/[a-z0-9/_-]+\.vtt$/);
const demoVideo = z.object({
  webm: demoVideoAsset.regex(/\.webm$/).optional(),
  mp4: demoVideoAsset.regex(/\.mp4$/).optional(),
  poster: demoPosterAsset,
  captions: demoCaptionAsset.optional(),
}).refine((value) => Boolean(value.webm || value.mp4), { message: "video requires webm or mp4" });
const demoMediaGroup = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(["comparison", "single"]),
  items: z.array(z.object({
    label: z.string().min(1),
    note: z.string().min(1).optional(),
    video: demoVideo,
  })).min(1).max(2),
}).superRefine((group, context) => {
  const expectedItems = group.kind === "comparison" ? 2 : 1;
  if (group.items.length !== expectedItems) {
    context.addIssue({ code: "custom", message: `${group.kind} media group requires ${expectedItems} item(s)`, path: ["items"] });
  }
});

const demoDisclosure = "本页面为个人参与项目的匿名化演示或独立重建，不包含实习公司的名称、内部代码、私有数据和未公开产品信息，也不代表原公司的官方实现。";
const demos = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/demos" }),
  schema: z.object({
    ...dated,
    role: z.string().min(1),
    period: z.string().regex(/^\d{4}(?: (?:Q[1-4]|上半年|下半年))?$/).optional(),
    contributions: z.array(z.string().min(1)).min(1),
    stack: z.array(z.string().min(1)).min(1),
    video: demoVideo.optional(),
    mediaGroups: z.array(demoMediaGroup).default([]),
    evidence: z.array(z.string().min(1)).min(1),
    sources: z.array(source).default([]),
    anonymized: z.literal(true),
    disclosure: z.literal(demoDisclosure),
    mediaRights: z.enum(["original", "authorized", "open-licensed"]),
    public: z.literal(true),
    company: z.never().optional(),
    employer: z.never().optional(),
    client: z.never().optional(),
  }).strict(),
});

export const collections = {
  papers,
  models: defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/models" }), schema: model }),
  datasets: defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/datasets" }), schema: dataset }),
  projects,
  roadmap,
  demos,
};
