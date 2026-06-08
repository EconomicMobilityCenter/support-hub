import { createServerFn } from "@tanstack/react-start";
import yaml from "js-yaml";

export type ContentItem = {
  slug: string;
  title: string;
  category: string;
  group: string;
  order: number;
  type: "video" | "document" | "article" | string;
  orgs: string[];
  published: boolean;
  link?: string;
  body: string;
};

export type OrgConfig = {
  id: string;
  name: string;
  products?: string[];
  contactName?: string;
  contactEmail?: string;
};

type RawOrgConfig = {
  name?: string;
  displayName?: string;
  products?: string[];
  contactName?: string;
  contactEmail?: string;
  contact?: { name?: string; email?: string; label?: string };
};

function normalizeOrg(id: string, v: RawOrgConfig): OrgConfig {
  return {
    id,
    name: v.name ?? v.displayName ?? id,
    products: Array.isArray(v.products) ? v.products : [],
    contactName: v.contactName ?? v.contact?.name,
    contactEmail: v.contactEmail ?? v.contact?.email,
  };
}

export type ContentBundle = {
  items: ContentItem[];
  orgs: Record<string, OrgConfig>;
  error?: string;
};

const REPO = "EconomicMobilityCenter/EMC-Support-Resources";
const BRANCH = "main";
const TTL_MS = 10 * 60 * 1000;

let cache: { data: ContentBundle; expiresAt: number } | null = null;

function parseFrontmatter(raw: string, slug: string): ContentItem | null {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) return null;
  let fm: Record<string, unknown>;
  try {
    fm = (yaml.load(match[1]) as Record<string, unknown>) ?? {};
  } catch {
    return null;
  }
  const orgs = Array.isArray(fm.orgs) ? (fm.orgs as unknown[]).map(String) : [];
  return {
    slug,
    title: String(fm.title ?? slug),
    category: String(fm.category ?? ""),
    group: String(fm.group ?? "Uncategorized"),
    order: typeof fm.order === "number" ? fm.order : Number(fm.order ?? 100),
    type: String(fm.type ?? "article"),
    orgs,
    published: fm.published !== false,
    link: fm.link ? String(fm.link) : undefined,
    body: match[2] ?? "",
  };
}

async function fetchBundle(): Promise<ContentBundle> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "emc-support-hub",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const listRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents?ref=${BRANCH}`,
      { headers },
    );
    if (!listRes.ok) {
      return { items: [], orgs: {}, error: `Content list ${listRes.status}` };
    }
    const list = (await listRes.json()) as Array<{ name: string; type: string }>;
    const SKIP = new Set(["README.md", "orgs.json"]);
    const mdFiles = Array.isArray(list)
      ? list.filter(
          (e) =>
            e.type === "file" &&
            !SKIP.has(e.name) &&
            (e.name.endsWith(".md") || e.name === "ccmr-faqs-md"),
        )
      : [];

    const items: ContentItem[] = [];
    await Promise.all(
      mdFiles.map(async (f) => {
        const r = await fetch(
          `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${f.name}`,
        );
        if (!r.ok) return;
        const raw = await r.text();
        const slug = f.name.replace(/\.md$/, "").replace(/-md$/, "");
        const item = parseFrontmatter(raw, slug);
        if (item) items.push(item);
      }),
    );

    let orgs: Record<string, OrgConfig> = {};
    const orgsRes = await fetch(
      `https://raw.githubusercontent.com/${REPO}/${BRANCH}/orgs.json`,
    );
    if (orgsRes.ok) {
      try {
        const raw = (await orgsRes.json()) as Record<string, RawOrgConfig>;
        orgs = Object.fromEntries(
          Object.entries(raw).map(([id, v]) => [id, normalizeOrg(id, v)]),
        );
      } catch (err) {
        console.warn(
          "[content] Failed to parse orgs.json from GitHub — check JSON syntax:",
          err instanceof Error ? err.message : err,
        );
        orgs = {};
      }
    } else {
      console.warn(`[content] orgs.json fetch failed: ${orgsRes.status}`);
    }

    return { items, orgs };
  } catch (err) {
    return {
      items: [],
      orgs: {},
      error: err instanceof Error ? err.message : "Failed to load content",
    };
  }
}

export const getContent = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  const data = await fetchBundle();
  cache = { data, expiresAt: now + TTL_MS };
  return data;
});