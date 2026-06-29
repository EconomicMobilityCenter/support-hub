import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const helpTypeEnum = z.enum(["A", "B", "C", "D", "E"]);
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
  submissionId: z.string().uuid().optional().nullable(),
});

export type SubmissionInput = z.infer<typeof baseSchema>;
export type HelpType = z.infer<typeof helpTypeEnum>;
export type Severity = z.infer<typeof severityEnum>;

const attachmentUploadSchema = z.object({
  submissionId: z.string().uuid(),
  orgId: z.string().trim().min(1).max(200),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().max(200).optional().nullable(),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
});

const allowedAttachmentName = /\.(png|jpg|jpeg|gif|webp|heic|pdf|doc|docx|xls|xlsx|csv|txt)$/i;

const SEVERITY_LABELS: Record<Severity, string> = {
  nice_to_have: "Not blocking — would be nice to fix",
  workaround: "Inconvenient but I have a workaround",
  blocking: "Blocking me from doing my work",
  urgent: "Urgent — blocking my whole team / a deadline",
};

const PATH_LABELS: Record<HelpType, string> = {
  A: "Question",
  B: "Report not delivered",
  C: "Data missing or wrong",
  D: "Other",
  E: "Feedback and Requests",
};

function humanizeKey(k: string): string {
  return k
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function detailsToFields(details: Record<string, unknown> | undefined): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  if (!details) return out;
  for (const [k, v] of Object.entries(details)) {
    if (v == null || v === "") continue;
    if (k === "attachmentPaths" || k === "submissionId") continue;
    const label = humanizeKey(k);
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      out.push({
        label,
        value: v.map((i) => (typeof i === "string" ? i : JSON.stringify(i))).join(", "),
      });
    } else {
      out.push({ label, value: typeof v === "string" ? v : JSON.stringify(v) });
    }
  }
  return out;
}

export const submitForm = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => baseSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const values = {
      type: data.type,
      org_id: data.orgId ?? null,
      org_name: data.orgName ?? null,
      product: data.product ?? null,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      summary: data.summary,
      status: "new",
      payload: {
        helpType: data.helpType,
        partner: data.partner ?? null,
        campus: data.campus ?? null,
        severity: data.severity ?? null,
        ...data.details,
      } as Record<string, unknown> as never,
    };
    let row: { id: string } | null = null;
    let error;
    if (data.submissionId) {
      // Finalize an existing draft created to authorize attachment uploads.
      const res = await supabaseAdmin
        .from("support_submissions")
        .update(values)
        .eq("id", data.submissionId)
        .eq("status", "draft")
        .select("id")
        .single();
      row = res.data;
      error = res.error;
    } else {
      const res = await supabaseAdmin
        .from("support_submissions")
        .insert(values)
        .select("id")
        .single();
      row = res.data;
      error = res.error;
    }
    if (error) {
      console.error("submitForm insert failed", error);
      throw new Error("Failed to save submission");
    }

    // Route to Jira based on product slug. Failures are non-blocking.
    let jiraKey: string | null = null;
    let jiraUrl: string | null = null;
    let jiraError: string | null = null;
    try {
      const [{ getContentBundleForServer }, { createJiraIssue, buildDescriptionAdf, PATH_LABEL_TAG, PATH_SUMMARY_PREFIX }] =
        await Promise.all([
          import("@/lib/content.functions"),
          import("@/lib/jira.server"),
        ]);
      const content = await getContentBundleForServer();
      const productKey = data.product ?? "";
      const route =
        content.feedbackRouting[productKey] ??
        content.feedbackRouting["_fallback"];
      if (!route) {
        jiraError = "No feedback routing configured (missing _fallback)";
      } else {
        // Collect signed attachment URLs (if any) for the Jira description.
        const attachments: Array<{ name: string; url: string }> = [];
        try {
          const folder = `submissions/${row!.id}`;
          const { data: files } = await supabaseAdmin.storage
            .from("support-attachments")
            .list(folder, { limit: 100 });
          if (files && files.length > 0) {
            const paths = files
              .filter((f) => f.name && !f.name.startsWith("."))
              .map((f) => `${folder}/${f.name}`);
            if (paths.length > 0) {
              const { data: signed } = await supabaseAdmin.storage
                .from("support-attachments")
                .createSignedUrls(paths, 60 * 60 * 24 * 30);
              if (signed) {
                for (const s of signed) {
                  if (s.signedUrl)
                    attachments.push({
                      name: s.path?.split("/").pop() ?? "attachment",
                      url: s.signedUrl,
                    });
                }
              }
            }
          }
        } catch (attachErr) {
          console.error("attachment signed URL generation failed", attachErr);
        }

        const fields: Array<{ label: string; value: string }> = [
          { label: "Path", value: PATH_LABELS[data.helpType] },
          { label: "Submitted by", value: `${data.contactName} <${data.contactEmail}>` },
        ];
        if (data.orgName || data.partner)
          fields.push({ label: "Partner", value: data.orgName ?? data.partner ?? "" });
        if (data.campus) fields.push({ label: "Campus", value: data.campus });
        if (data.product) fields.push({ label: "Product", value: data.product });
        if (data.severity)
          fields.push({ label: "Severity", value: SEVERITY_LABELS[data.severity] });
        fields.push({ label: "Submission ID", value: row!.id });
        fields.push(...detailsToFields(data.details));

        const descriptionAdf = buildDescriptionAdf({
          fields,
          body: data.summary,
          attachments,
        });

        const summary = `${PATH_SUMMARY_PREFIX[data.helpType] ?? ""} ${data.summary}`.trim();
        const result = await createJiraIssue({
          route,
          summary,
          descriptionAdf,
          extraLabels: [PATH_LABEL_TAG[data.helpType] ?? "support"],
        });
        if (result.ok) {
          jiraKey = result.key;
          jiraUrl = result.url;
        } else {
          jiraError = result.error;
          console.error("Jira create failed", result.error);
        }
      }
    } catch (err) {
      jiraError = err instanceof Error ? err.message : "Jira create failed";
      console.error("Jira routing failed", err);
    }

    // Slack notification (non-blocking). Only post on successful Jira create
    // so the channel reflects real tickets, not failures.
    let slackError: string | null = null;
    try {
      if (jiraKey && jiraUrl) {
        const { getContentBundleForServer } = await import("@/lib/content.functions");
        const content = await getContentBundleForServer();
        const productKey = data.product ?? "";
        const route =
          content.feedbackRouting[productKey] ??
          content.feedbackRouting["_fallback"];
        const channel = route?.slackChannel;
        if (channel) {
          const { postSlackNotification } = await import("@/lib/slack.server");
          const productLabel = route?.label ?? data.product ?? "Unrouted";
          const fields: Array<{ label: string; value: string }> = [
            { label: "Path", value: PATH_LABELS[data.helpType] },
            { label: "Product", value: productLabel },
            {
              label: "Submitted by",
              value: `${data.contactName} <${data.contactEmail}>`,
            },
          ];
          if (data.orgName || data.partner)
            fields.push({ label: "Partner", value: data.orgName ?? data.partner ?? "" });
          if (data.campus) fields.push({ label: "Campus", value: data.campus });
          if (data.severity)
            fields.push({ label: "Severity", value: SEVERITY_LABELS[data.severity] });

          const slackRes = await postSlackNotification({
            channel,
            fallbackChannelNames: ["error-notifications", "support-submissions"],
            title: `:ticket: New ${PATH_LABELS[data.helpType]} — ${productLabel}`,
            fields,
            body: data.summary,
            ticketKey: jiraKey,
            ticketUrl: jiraUrl,
          });
          if (!slackRes.ok) {
            slackError = slackRes.error;
            console.error("Slack notify failed", slackRes.error);
          }
        }
      }
    } catch (err) {
      slackError = err instanceof Error ? err.message : "Slack notify failed";
      console.error("Slack notify threw", err);
    }

    await supabaseAdmin
      .from("support_submissions")
      .update({
        jira_key: jiraKey,
        jira_url: jiraUrl,
        jira_error: jiraError,
        payload: {
          helpType: data.helpType,
          partner: data.partner ?? null,
          campus: data.campus ?? null,
          severity: data.severity ?? null,
          ...data.details,
          ...(slackError ? { slack_error: slackError } : {}),
        } as Record<string, unknown> as never,
      })
      .eq("id", row!.id);

    return {
      id: row!.id,
      helpType: data.helpType,
      jiraKey,
      jiraUrl,
    };
  });

// Creates a short-lived draft submission row used to authorize attachment uploads.
// The storage policy on support-attachments only allows uploads into a folder
// whose UUID matches an existing submission row created within the last hour.
export const createDraftSubmission = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        type: z.enum(["issue", "support"]),
        contactEmail: z.string().trim().email().max(320),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("support_submissions")
      .insert({
        type: data.type,
        status: "draft",
        contact_name: "(draft)",
        contact_email: data.contactEmail,
        summary: "(draft)",
        payload: {} as Record<string, unknown> as never,
      })
      .select("id")
      .single();
    if (error || !row) {
      console.error("createDraftSubmission failed", error);
      throw new Error("Failed to create draft submission");
    }
    return { id: row.id as string };
  });

export const createAttachmentUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => attachmentUploadSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.orgId === "public") {
      throw new Error("Only verified partners are allowed to add attachments");
    }
    if (!allowedAttachmentName.test(data.fileName)) {
      throw new Error("This attachment file type is not allowed");
    }

    const { getContentBundleForServer } = await import("@/lib/content.functions");
    const content = await getContentBundleForServer();
    if (!content.orgs[data.orgId]) {
      throw new Error("Only verified partners are allowed to add attachments");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("support_submissions")
      .select("id, status, created_at")
      .eq("id", data.submissionId)
      .eq("status", "draft")
      .single();

    if (draftError || !draft) {
      console.error("createAttachmentUploadUrl draft lookup failed", draftError);
      throw new Error("Couldn't prepare upload. Please try again.");
    }

    const createdAt = new Date(draft.created_at).getTime();
    if (!Number.isFinite(createdAt) || createdAt < Date.now() - 60 * 60 * 1000) {
      throw new Error("Upload session expired. Please try again.");
    }

    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `submissions/${data.submissionId}/${safeName}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("support-attachments")
      .createSignedUploadUrl(path);

    if (error || !signed?.token) {
      console.error("createSignedUploadUrl failed", error);
      throw new Error("Couldn't prepare upload. Please try again.");
    }

    return { path: signed.path ?? path, token: signed.token };
  });