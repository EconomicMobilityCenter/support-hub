import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const helpTypeEnum = z.enum(["A", "B", "C", "D"]);
const severityEnum = z.enum(["nice_to_have", "workaround", "blocking", "urgent"]);

const baseSchema = z.object({
  type: z.enum(["issue", "support"]),
  helpType: helpTypeEnum,
  orgId: z.string().max(200).optional().nullable(),
  orgName: z.string().max(300).optional().nullable(),
  partner: z.string().trim().max(300).optional().nullable(),
  campus: z.string().trim().max(300).optional().nullable(),
  product: z.string().max(200).optional().nullable(),
  contactName: z.string().trim().min(1).max(200),
  contactEmail: z.string().trim().email().max(320),
  summary: z.string().trim().min(1).max(5000),
  severity: severityEnum.optional().nullable(),
  // Extra fields per form path live in `details`
  details: z.record(z.string(), z.unknown()).default({}),
});

export type SubmissionInput = z.infer<typeof baseSchema>;
export type HelpType = z.infer<typeof helpTypeEnum>;
export type Severity = z.infer<typeof severityEnum>;

const SEVERITY_LABELS: Record<Severity, string> = {
  nice_to_have: "Not blocking — would be nice to fix",
  workaround: "Inconvenient but I have a workaround",
  blocking: "Blocking me from doing my work",
  urgent: "Urgent — blocking my whole team / a deadline",
};

function buildEmailBody(data: SubmissionInput, submittedAt: Date): { subject: string; text: string; to: string } {
  const isUrgent =
    data.helpType === "B" ||
    (data.helpType === "C" && (data.severity === "urgent" || data.severity === "blocking"));

  const to =
    data.helpType === "A" || data.helpType === "D"
      ? "support@economicmobilitycenter.org"
      : "data@economicmobilitycenter.org";

  const pathLabel = {
    A: "Question",
    B: "Report not delivered",
    C: "Data missing or wrong",
    D: "Other",
  }[data.helpType];

  const subjectBase = `[EMC Support] ${pathLabel} — ${data.summary.slice(0, 80)}`;
  const subject = isUrgent ? `[URGENT] ${subjectBase}` : subjectBase;

  const lines: string[] = [];
  lines.push(`Submitted: ${submittedAt.toISOString()}`);
  lines.push(`Path: ${pathLabel} (${data.helpType})`);
  lines.push("");
  lines.push("--- Contact ---");
  lines.push(`Name: ${data.contactName}`);
  lines.push(`Email: ${data.contactEmail}`);
  lines.push(`Partner: ${data.orgName ?? data.partner ?? "(unknown)"}`);
  lines.push(`Campus: ${data.campus ?? "(none)"}`);
  lines.push(`Product: ${data.product ?? "(none)"}`);
  if (data.severity) lines.push(`Severity: ${SEVERITY_LABELS[data.severity]}`);
  lines.push("");
  lines.push("--- Summary ---");
  lines.push(data.summary);
  if (data.details && Object.keys(data.details).length) {
    lines.push("");
    lines.push("--- Details ---");
    for (const [k, v] of Object.entries(data.details)) {
      if (v == null || v === "") continue;
      lines.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
    }
  }

  return { subject, text: lines.join("\n"), to };
}

export const submitForm = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error, data: row } = await supabaseAdmin
      .from("support_submissions")
      .insert({
        type: data.type,
        org_id: data.orgId ?? null,
        org_name: data.orgName ?? null,
        product: data.product ?? null,
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        summary: data.summary,
        payload: {
          helpType: data.helpType,
          partner: data.partner ?? null,
          campus: data.campus ?? null,
          severity: data.severity ?? null,
          ...data.details,
        } as Record<string, unknown> as never,
      })
      .select("id")
      .single();
    if (error) {
      console.error("submitForm insert failed", error);
      throw new Error("Failed to save submission");
    }

    // Best-effort email notification. Logged for now; will be wired to Lovable Emails
    // once the project's sender domain is configured.
    try {
      const email = buildEmailBody(data, new Date());
      console.log("[get-help] notification target:", email.to);
      console.log("[get-help] subject:", email.subject);
      console.log("[get-help] body:\n" + email.text);
    } catch (err) {
      console.error("notification build failed", err);
    }

    return { id: row.id, helpType: data.helpType };
  });