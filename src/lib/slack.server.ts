const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";

export type SlackField = { label: string; value: string };

export type SlackPostResult =
  | { ok: true; ts: string | null }
  | { ok: false; error: string };

export async function postSlackNotification(opts: {
  channel: string;
  fallbackChannelNames?: string[];
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

  const postMessage = async (channel: string) => {
    return fetch(`${GATEWAY_URL}/chat.postMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": slackKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        text: opts.title,
        blocks,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });
  };

  const attempts = [opts.channel];
  let lastError = "Slack notification failed";

  for (const channel of attempts) {
    const result = await sendAndParse(postMessage, channel);
    if (result.ok) return result;
    lastError = result.error;
    if (!isRecoverableChannelError(result.slackError)) break;

    for (const name of opts.fallbackChannelNames ?? []) {
      const resolved = await resolvePublicChannelId(name, lovableKey, slackKey);
      if (!resolved.ok) {
        lastError = `${lastError}; fallback ${name}: ${resolved.error}`;
        continue;
      }
      const fallbackResult = await sendAndParse(postMessage, resolved.channelId);
      if (fallbackResult.ok) return fallbackResult;
      lastError = `${lastError}; fallback ${name}: ${fallbackResult.error}`;
      if (!isRecoverableChannelError(fallbackResult.slackError)) break;
    }
  }
  return { ok: false, error: lastError };
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

async function sendAndParse(
  postMessage: (channel: string) => Promise<Response>,
  channel: string,
): Promise<SlackPostResult & { slackError?: string }> {
  let res: Response;
  try {
    res = await postMessage(channel);
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
    return {
      ok: false,
      error: `Slack ${res.status} ${data.error ?? "unknown"}`,
      slackError: data.error,
    };
  }
  return { ok: true, ts: data.ts ?? null };
}

function isRecoverableChannelError(error?: string): boolean {
  return error === "channel_not_found" || error === "not_in_channel";
}

async function resolvePublicChannelId(
  name: string,
  lovableKey: string,
  slackKey: string,
): Promise<{ ok: true; channelId: string } | { ok: false; error: string }> {
  const target = name.replace(/^#/, "").toLowerCase();
  let cursor = "";
  do {
    const url = new URL(`${GATEWAY_URL}/conversations.list`);
    url.searchParams.set("limit", "999");
    url.searchParams.set("types", "public_channel");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": slackKey,
      },
    });
    const text = await res.text();
    let data: {
      ok?: boolean;
      error?: string;
      channels?: Array<{ id: string; name?: string; previous_names?: string[] }>;
      response_metadata?: { next_cursor?: string };
    };
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: `channel lookup non-JSON (HTTP ${res.status})` };
    }
    if (!res.ok || !data.ok) {
      return { ok: false, error: `channel lookup ${res.status} ${data.error ?? "unknown"}` };
    }

    const match = data.channels?.find(
      (c) => c.name?.toLowerCase() === target || c.previous_names?.some((n) => n.toLowerCase() === target),
    );
    if (match) return { ok: true, channelId: match.id };
    cursor = data.response_metadata?.next_cursor ?? "";
  } while (cursor);

  return { ok: false, error: `channel ${name} not found` };
}