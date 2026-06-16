const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";
const CHANNEL = "#error-notifications";

export type EmailFailureType = "transient" | "rate_limited" | "forbidden" | "dlq";

export interface NotifyEmailErrorInput {
  queue: string;
  recipient?: string | null;
  template?: string | null;
  failureType: EmailFailureType;
  error: string;
}

export async function notifyEmailError(input: NotifyEmailErrorInput): Promise<void> {
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const slackApiKey = process.env.SLACK_API_KEY;
  if (!lovableApiKey || !slackApiKey) {
    return;
  }

  const now = new Date();
  const timestamp = now.toISOString().replace("T", " ").replace(/\..+/, " UTC");
  const errorText = (input.error || "").slice(0, 500);

  const text =
    `:rotating_light: *Support Portal*\n` +
    `*Time:* ${timestamp}\n` +
    `*Recipient:* ${input.recipient ?? "unknown"}\n` +
    `*Template:* ${input.template ?? input.queue}\n` +
    `*Failure type:* ${input.failureType}\n` +
    `*Error:* ${errorText}`;

  try {
    const res = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": slackApiKey,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel: CHANNEL, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Slack notify failed", { status: res.status, body: body.slice(0, 300) });
      return;
    }
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (data && data.ok === false) {
      console.error("Slack notify error", { error: data.error });
    }
  } catch (err) {
    console.error("Slack notify threw", { error: err instanceof Error ? err.message : String(err) });
  }
}