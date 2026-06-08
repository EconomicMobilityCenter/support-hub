import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const baseSchema = z.object({
  type: z.enum(["issue", "support"]),
  orgId: z.string().max(200).optional().nullable(),
  orgName: z.string().max(300).optional().nullable(),
  product: z.string().max(200).optional().nullable(),
  contactName: z.string().trim().min(1).max(200),
  contactEmail: z.string().trim().email().max(320),
  summary: z.string().trim().min(1).max(5000),
  // Extra fields per form type live in `details`
  details: z.record(z.string(), z.unknown()).default({}),
});

export type SubmissionInput = z.infer<typeof baseSchema>;

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
        payload: data.details,
      })
      .select("id")
      .single();
    if (error) {
      console.error("submitForm insert failed", error);
      throw new Error("Failed to save submission");
    }
    return { id: row.id };
  });