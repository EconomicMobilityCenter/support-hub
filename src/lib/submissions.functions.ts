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
};

function humanizeKey(k: string): string {
  return k
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function buildTemplateData(data: SubmissionInput, submittedAt: Date) {
  const isUrgent =
    data.helpType === "B" ||
    (data.helpType === "C" && (data.severity === "urgent" || data.severity === "blocking"));
  const pathLabel = PATH_LABELS[data.helpType];

  const detailLines: Array<{ label: string; value: string }> = [];
  if (data.details) {
    for (const [k, v] of Object.entries(data.details)) {
      if (v == null || v === "") continue;
      const label = humanizeKey(k);
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        detailLines.push({
          label,
          value: v.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join(", "),
        });
      } else {
        detailLines.push({
          label,
          value: typeof v === "string" ? v : JSON.stringify(v),
        });
      }
    }
  }

  return {
    pathLabel,
    helpType: data.helpType,
    isUrgent,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    partner: data.orgName ?? data.partner ?? undefined,
    campus: data.campus ?? undefined,
    product: data.product ?? undefined,
    severityLabel: data.severity ? SEVERITY_LABELS[data.severity] : undefined,
    summary: data.summary,
    submittedAt: submittedAt.toISOString(),
    detailLines,
  };
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

    // Best-effort email notification — render and enqueue directly.
    // The /lovable/email/transactional/send route requires a signed-in user;
    // form submitters are anonymous so we enqueue here using the admin client.
    try {
      const [{ render }, React, { template }] = await Promise.all([
        import("@react-email/components"),
        import("react"),
        import("@/lib/email-templates/support-submission-notification"),
      ]);
      const templateData = buildTemplateData(data, new Date());
      const element = React.createElement(template.component, templateData);
      const [html, text] = await Promise.all([
        render(element),
        render(element, { plainText: true }),
      ]);
      const subject =
        typeof template.subject === "function"
          ? template.subject(templateData)
          : template.subject;
      const messageId = `support-submission-${row!.id}`;
      // Get or create an unsubscribe token for the recipient (required by Lovable Emails).
      const recipientLc = template.to!.toLowerCase();
      let unsubscribeToken: string | undefined;
      const { data: existingTok } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .select("token, used_at")
        .eq("email", recipientLc)
        .maybeSingle();
      if (existingTok && !existingTok.used_at) {
        unsubscribeToken = existingTok.token;
      } else {
        const newTok = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        await supabaseAdmin
          .from("email_unsubscribe_tokens")
          .upsert(
            { token: newTok, email: recipientLc },
            { onConflict: "email", ignoreDuplicates: true },
          );
        const { data: storedTok } = await supabaseAdmin
          .from("email_unsubscribe_tokens")
          .select("token")
          .eq("email", recipientLc)
          .maybeSingle();
        unsubscribeToken = storedTok?.token ?? newTok;
      }
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: "support-submission-notification",
        recipient_email: template.to!,
        status: "pending",
      });
      const { error: enqueueError } = await supabaseAdmin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: messageId,
          to: template.to!,
          from: "EMC Support <noreply@support.economicmobilitycenter.org>",
          sender_domain: "notify.support.economicmobilitycenter.org",
          subject,
          html,
          text,
          purpose: "transactional",
          label: "support-submission-notification",
          idempotency_key: messageId,
          reply_to: data.contactEmail,
          unsubscribe_token: unsubscribeToken,
          queued_at: new Date().toISOString(),
        } as never,
      });
      if (enqueueError) {
        console.error("submission email enqueue failed", enqueueError);
        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "support-submission-notification",
          recipient_email: template.to!,
          status: "failed",
          error_message: enqueueError.message?.slice(0, 1000) ?? "enqueue failed",
        });
      }
    } catch (err) {
      console.error("submission email send failed", err);
    }

    return { id: row!.id, helpType: data.helpType };
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