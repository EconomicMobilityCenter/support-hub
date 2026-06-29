const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";

export type SlackField = { label: string; value: string };

export type SlackPostResult =
  | { ok: true; ts: string | null }
  | { ok: false; error: string };

export async function postSlackNotification(opts: {
  channel: string;
  title: string;
  fields: SlackField[];
  body?: string | null;
  ticketUrl?: string | null;
  ticketKey?: string | null;
}): Promise<SlackPostResult> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const slackKey = process.env.SLACK_API_KEY;
  if (!lovableKey || !slackKey) {
    return { ok: false, error: "Slack credentials are not configured" };
  }

  const blocks: Array<Record<string, unknown>> = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${opts.title}*` },
    },
  ];

  if (opts.fields.length) {
    // Slack section "fields" supports max 10 items, each <=2000 chars.
    const fieldChunks = opts.fields.slice(0, 10).map((f) => ({
      type: "mrkdwn",
      text: `*${f.label}*\n${truncate(f.value, 1800)}`,
    }));
    blocks.push({ type: "section", fields: fieldChunks });
  }

  if (opts.body) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: truncate(opts.body, 2800) },
    });
  }

  if (opts.ticketKey && opts.ticketUrl) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${opts.ticketUrl}|View ${opts.ticketKey} in Jira>`,
        },
      ],
    });
  }

  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": slackKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: opts.channel,
        text: opts.title,
        blocks,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Slack network error" };
  }

  const text = await res.text();
  let data: { ok?: boolean; error?: string; ts?: string };
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: `Slack non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}` };
  }
  if (!res.ok || !data.ok) {
    return { ok: false, error: `Slack ${res.status} ${data.error ?? "unknown"}` };
  }
  return { ok: true, ts: data.ts ?? null };
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}