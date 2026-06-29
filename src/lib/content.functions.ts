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
    const SKIP = new Set(["README.md"]);
    const isContentFile = (name: string) =>
      name.endsWith(".md") || name === "ccmr-faqs-md";

    type Entry = { name: string; path: string; type: string };

    async function listDir(path: string): Promise<Entry[]> {
      const url = path
        ? `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`
        : `https://api.github.com/repos/${REPO}/contents?ref=${BRANCH}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Content list ${res.status} for /${path}`);
      const json = (await res.json()) as Entry[];
      return Array.isArray(json) ? json : [];
    }

    const rootEntries = await listDir("");
    const fileEntries: Entry[] = [];
    const subdirs: Entry[] = [];
    for (const e of rootEntries) {
      if (e.type === "file" && !SKIP.has(e.name) && isContentFile(e.name)) {
        fileEntries.push(e);
      } else if (e.type === "dir" && e.name !== "Configuration") {
        subdirs.push(e);
      }
    }
    // Recurse one level into product/content subdirectories (e.g. Products/CCMR-WW).
    const nested = await Promise.all(
      subdirs.map(async (d) => {
        try {
          const inner = await listDir(d.path);
          const out: Entry[] = [];
          for (const e of inner) {
            if (e.type === "file" && !SKIP.has(e.name) && isContentFile(e.name)) {
              out.push(e);
            } else if (e.type === "dir") {
              try {
                const deeper = await listDir(e.path);
                for (const f of deeper) {
                  if (f.type === "file" && !SKIP.has(f.name) && isContentFile(f.name)) {
                    out.push(f);
                  }
                }
              } catch (err) {
                console.warn(`[content] list ${e.path} failed:`, err);
              }
            }
          }
          return out;
        } catch (err) {
          console.warn(`[content] list ${d.path} failed:`, err);
          return [];
        }
      }),
    );
    for (const list of nested) fileEntries.push(...list);

    const items: ContentItem[] = [];
    await Promise.all(
      fileEntries.map(async (f) => {
        const r = await fetch(
          `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${f.path}`,
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
      `https://raw.githubusercontent.com/${REPO}/${BRANCH}/Configuration/orgs.json`,
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

export async function getContentBundleForServer(): Promise<ContentBundle> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  const data = await fetchBundle();
  cache = { data, expiresAt: now + TTL_MS };
  return data;
}

export const getContent = createServerFn({ method: "GET" }).handler(async () => {
  return getContentBundleForServer();
});