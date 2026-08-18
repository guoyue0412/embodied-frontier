const filterKeys = ["query", "track", "tag", "year", "venue", "status"];

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/\s+/g, " ").trim();
}

export function buildSearchIndex(papers) {
  const records = papers.map((paper) => {
    const year = String(paper.date ?? paper.venue.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? "").slice(0, 4);
    return {
      slug: paper.slug,
      title: paper.title,
      summary: paper.summary,
      track: paper.track,
      venue: paper.venue,
      year,
      updated: paper.updated,
      status: paper.status,
      tags: [...paper.tags],
      haystack: normalize([paper.title, paper.summary, paper.track, paper.venue, ...paper.tags, paper.text].join(" ")),
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
  return { version: 1, records };
}

export function searchRecords(records, filters = {}) {
  const query = normalize(filters.query);
  return records.filter((record) => (
    (!query || query.split(" ").every((token) => record.haystack.includes(token)))
    && (!filters.track || record.track === filters.track)
    && (!filters.tag || record.tags.includes(filters.tag))
    && (!filters.year || record.year === filters.year)
    && (!filters.venue || record.venue === filters.venue)
    && (!filters.status || record.status === filters.status)
  ));
}

export function filtersFromSearchParams(params) {
  const filters = {};
  const mapping = { q: "query", track: "track", tag: "tag", year: "year", venue: "venue", status: "status" };
  for (const [param, key] of Object.entries(mapping)) {
    const value = params.get(param)?.trim();
    if (value) filters[key] = value;
  }
  return Object.fromEntries(filterKeys.filter((key) => filters[key]).map((key) => [key, filters[key]]));
}

export function filtersToSearchParams(filters) {
  const params = new URLSearchParams();
  const mapping = { query: "q", track: "track", tag: "tag", year: "year", venue: "venue", status: "status" };
  for (const key of filterKeys) if (filters[key]) params.set(mapping[key], filters[key]);
  return params;
}
