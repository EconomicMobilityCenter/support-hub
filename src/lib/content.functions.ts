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
  product?: string;
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

export type FeedbackRoute = {
  label: string;
  jiraEpic: string;
  slackChannel?: string;
  issueType?: string;
  defaultStatus?: string;
  labels?: string[];
};

type RawOrgConfig = {
  name?: string;
  displayName?: string;
  products?: string[];
  contactName?: string;
  contactEmail?: string;
  contact?: { name?: string; email?: string; label?: string };
};

function parseJsonWithMissingClosingBraceRepair<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (initialError) {
    const withoutTrailingCommas = raw.replace(/,\s*([}\]])/g, "$1");
    const opens = (withoutTrailingCommas.match(/{/g) ?? []).length;
    const closes = (withoutTrailingCommas.match(/}/g) ?? []).length;
    const repaired = withoutTrailingCommas.trimEnd() + "}".repeat(Math.max(0, opens - closes));
    try {
      return JSON.parse(repaired) as T;
    } catch {
      throw initialError;
    }
  }
}

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
  feedbackRouting: Record<string, FeedbackRoute>;
  error?: string;
};

const REPO = "EconomicMobilityCenter/EMC-Support-Resources";
const BRANCH = "main";
const TTL_MS = 10 * 60 * 1000;
const FAILURE_BACKOFF_MS = 60 * 1000;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
// Rewritten asset URLs go through jsDelivr's GitHub CDN so browsers can
// render PDFs/images inline. raw.githubusercontent.com sends X-Frame-Options:
// deny and Content-Type: application/octet-stream, which blocks embedding.
const ASSET_BASE = `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}`;

let cache: { data: ContentBundle; expiresAt: number } | null = null;
let lastGood: ContentBundle | null = null;
let failUntil = 0;

type GitHubTreeEntry = { path: string; type: string };

function githubHeaders(includeAuth = true): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "emc-support-hub",
  };
  if (includeAuth && process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchGitHubApi(url: string): Promise<Response> {
  const authed = await fetch(url, { headers: githubHeaders(true) });
  if ((authed.status === 401 || authed.status === 403) && process.env.GITHUB_TOKEN) {
    console.warn(`[content] GitHub authed request failed with ${authed.status}; retrying public request`);
    return fetch(url, { headers: githubHeaders(false) });
  }
  return authed;
}

async function fetchRawText(path: string): Promise<string | null> {
  const r = await fetch(`${RAW_BASE}/${path}`);
  if (!r.ok) {
    console.warn(`[content] raw fetch failed ${r.status} for ${path}`);
    return null;
  }
  return r.text();
}

function contentSlug(path: string): string {
  const name = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
  return name.replace(/\.md$/, "").replace(/-md$/, "");
}

function contentDir(path: string): string {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
}

function resolveRelative(url: string, dir: string): string {
  if (!url) return url;
  if (/^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(url)) return url;
  if (url.startsWith("/")) return `${ASSET_BASE}${url}`;
  // Resolve ./ and ../ against dir
  const parts = dir ? dir.split("/") : [];
  const segs = url.split("/");
  for (const s of segs) {
    if (s === "" || s === ".") continue;
    if (s === "..") parts.pop();
    else parts.push(s);
  }
  return `${ASSET_BASE}/${parts.join("/")}`;
}

function rewriteRelativeUrls(body: string, dir: string): string {
  // Rewrites markdown ![alt](url) and [text](url) with relative urls.
  return body.replace(/(!?\[[^\]]*\])\(([^)\s]+)(\s+"[^"]*")?\)/g, (_m, prefix, url, title = "") => {
    const resolved = resolveRelative(url, dir);
    return `${prefix}(${resolved}${title})`;
  });
}

function parseFrontmatter(raw: string, slug: string, dir: string): ContentItem | null {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) return null;
  let fm: Record<string, unknown>;
  try {
    fm = (yaml.load(match[1]) as Record<string, unknown>) ?? {};
  } catch {
    return null;
  }
  const orgs = Array.isArray(fm.orgs) ? (fm.orgs as unknown[]).map(String) : [];
  const rawLink = fm.link ? String(fm.link) : undefined;
  const link = rawLink ? resolveRelative(rawLink, dir) : undefined;
  const body = rewriteRelativeUrls(match[2] ?? "", dir);
  return {
    slug,
    title: String(fm.title ?? slug),
    category: String(fm.category ?? ""),
    group: String(fm.group ?? "Uncategorized"),
    order: typeof fm.order === "number" ? fm.order : Number(fm.order ?? 100),
    type: String(fm.type ?? "article"),
    orgs,
    product: fm.product ? String(fm.product) : undefined,
    published: fm.published !== false,
    link,
    body,
  };
}

async function fetchBundle(): Promise<ContentBundle> {
  try {
    const SKIP = new Set(["README.md"]);
    const isContentPath = (path: string) => {
      const name = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
      return !path.startsWith("Configuration/") && !SKIP.has(name) && (name.endsWith(".md") || name === "ccmr-faqs-md");
    };

    const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
    const treeRes = await fetchGitHubApi(treeUrl);
    if (!treeRes.ok) {
      throw new Error(`Content tree ${treeRes.status} from GitHub`);
    }
    const treeJson = (await treeRes.json()) as { tree?: GitHubTreeEntry[]; truncated?: boolean };
    if (treeJson.truncated) {
      console.warn("[content] GitHub tree response was truncated; some content may be missing");
    }
    const filePaths = (treeJson.tree ?? [])
      .filter((entry) => entry.type === "blob" && isContentPath(entry.path))
      .map((entry) => entry.path);

    const items: ContentItem[] = [];
    await Promise.all(
      filePaths.map(async (path) => {
        const raw = await fetchRawText(path);
        if (!raw) return;
        const slug = contentSlug(path);
        const dir = contentDir(path);
        const item = parseFrontmatter(raw, slug, dir);
        if (item) items.push(item);
      }),
    );

    let orgs: Record<string, OrgConfig> = {};
    const orgsRaw = await fetchRawText("Configuration/orgs.json");
    if (orgsRaw) {
      try {
        const raw = parseJsonWithMissingClosingBraceRepair<Record<string, RawOrgConfig>>(orgsRaw);
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
    }

    let feedbackRouting: Record<string, FeedbackRoute> = {};
    try {
      const rawText = await fetchRawText("Configuration/feedback-routing.json");
      if (rawText) {
        feedbackRouting =
          parseJsonWithMissingClosingBraceRepair<Record<string, FeedbackRoute>>(rawText);
      }
    } catch (err) {
      console.warn(
        "[content] Failed to load feedback-routing.json:",
        err instanceof Error ? err.message : err,
      );
    }

    return { items, orgs, feedbackRouting };
  } catch (err) {
    return {
      items: [],
      orgs: {},
      feedbackRouting: {},
      error: err instanceof Error ? err.message : "Failed to load content",
    };
  }
}

export async function getContentBundleForServer(): Promise<ContentBundle> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  // Negative cache: while a recent failure is fresh, serve last-good bundle
  // (with the error attached) instead of hammering GitHub.
  if (failUntil > now && lastGood) {
    return { ...lastGood, error: lastGood.error ?? "Using cached content" };
  }
  const data = await fetchBundle();
  const failed = data.error || data.items.length === 0;
  if (!failed) {
    cache = { data, expiresAt: now + TTL_MS };
    lastGood = data;
    failUntil = 0;
    return data;
  }
  // Fetch failed — back off and, if we have prior good data, serve it.
  failUntil = now + FAILURE_BACKOFF_MS;
  if (lastGood) {
    return { ...lastGood, error: data.error ?? "Content temporarily unavailable" };
  }
  return data;
}

export const getContent = createServerFn({ method: "GET" }).handler(async () => {
  return getContentBundleForServer();
});