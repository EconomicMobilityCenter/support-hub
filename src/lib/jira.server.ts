import type { FeedbackRoute } from "@/lib/content.functions";

type AdfNode = Record<string, unknown>;

export type JiraCreateResult =
  | { ok: true; key: string; url: string }
  | { ok: false; error: string };

function projectKeyFromEpic(epic: string): string {
  const m = epic.match(/^([A-Z][A-Z0-9_]+)-\d+$/);
  if (!m) throw new Error(`Invalid Jira epic key: ${epic}`);
  return m[1];
}

function p(text: string): AdfNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function heading(text: string): AdfNode {
  return {
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text }],
  };
}

export function buildDescriptionAdf(opts: {
  fields: Array<{ label: string; value: string }>;
  body: string;
  attachments?: Array<{ name: string; url: string }>;
}): AdfNode {
  const content: AdfNode[] = [];
  if (opts.fields.length) {
    content.push(heading("Submission details"));
    content.push({
      type: "bulletList",
      content: opts.fields.map((f) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: `${f.label}: `, marks: [{ type: "strong" }] },
              { type: "text", text: f.value },
            ],
          },
        ],
      })),
    });
  }
  if (opts.body) {
    content.push(heading("Message"));
    for (const line of opts.body.split(/\r?\n/)) {
      content.push(p(line || " "));
    }
  }
  if (opts.attachments && opts.attachments.length) {
    content.push(heading("Attachments"));
    content.push({
      type: "bulletList",
      content: opts.attachments.map((a) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: a.name,
                marks: [{ type: "link", attrs: { href: a.url } }],
              },
            ],
          },
        ],
      })),
    });
  }
  return { type: "doc", version: 1, content };
}

export async function createJiraIssue(opts: {
  route: FeedbackRoute;
  summary: string;
  descriptionAdf: AdfNode;
  extraLabels?: string[];
}): Promise<JiraCreateResult> {
  const site = process.env.JIRA_SITE?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!site || !email || !token) {
    return { ok: false, error: "Jira credentials are not configured" };
  }

  let projectKey: string;
  try {
    projectKey = projectKeyFromEpic(opts.route.jiraEpic);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Bad epic key" };
  }

  const labels = Array.from(
    new Set([...(opts.route.labels ?? []), ...(opts.extraLabels ?? [])]),
  ).map((l) => l.replace(/\s+/g, "-"));

  const body = {
    fields: {
      project: { key: projectKey },
      summary: opts.summary.slice(0, 240),
      description: opts.descriptionAdf,
      issuetype: { name: opts.route.issueType || "Task" },
      parent: { key: opts.route.jiraEpic },
      labels,
    },
  };

  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  let res: Response;
  try {
    res = await fetch(`https://${site}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: `Jira ${res.status}: ${text.slice(0, 500)}` };
  }
  let json: { key?: string };
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "Jira returned non-JSON response" };
  }
  if (!json.key) return { ok: false, error: "Jira response missing issue key" };
  return {
    ok: true,
    key: json.key,
    url: `https://${site}/browse/${json.key}`,
  };
}

export const PATH_LABEL_TAG: Record<string, string> = {
  A: "question",
  B: "report-missing",
  C: "data-issue",
  D: "other",
  E: "feedback",
};

export const PATH_SUMMARY_PREFIX: Record<string, string> = {
  A: "[Question]",
  B: "[Report missing]",
  C: "[Data issue]",
  D: "[Other]",
  E: "[Feedback]",
};