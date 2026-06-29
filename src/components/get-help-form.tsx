import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrg } from "@/hooks/use-org";
import { useContent } from "@/hooks/use-content";
import { PRODUCTS, productName } from "@/lib/products";
import {
  submitForm,
  createDraftSubmission,
  createAttachmentUploadUrl,
  type SubmissionInput,
} from "@/lib/submissions.functions";
import { supabase } from "@/integrations/supabase/client";

type HelpType = "A" | "B" | "C" | "D" | "E";

const HELP_OPTIONS: { value: HelpType; label: string }[] = [
  { value: "A", label: "I have a question" },
  { value: "B", label: "My report wasn't delivered" },
  { value: "C", label: "Data is missing or looks wrong" },
  { value: "D", label: "Other" },
  { value: "E", label: "Feedback and Requests" },
];

const SEVERITY_OPTIONS: { value: SubmissionInput["severity"]; label: string }[] = [
  { value: "nice_to_have", label: "Minor — something looks off, but I can keep working" },
  { value: "workaround", label: "Moderate — I can work around it for now" },
  { value: "blocking", label: "Major — I'm stuck on something I need to do" },
  { value: "urgent", label: "Critical — this is stopping multiple people from working" },
];

const inputClass =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#8A8E96] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 focus:border-[#185FA5] transition-colors";
const inputBorder = { borderColor: "#E2E4E8" } as const;
const labelClass = "block text-[13px] font-medium mb-1.5 text-[#1A1A1A]";
const reqStar = <span style={{ color: "#A32D2D" }}> *</span>;

function DatePickerField({
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export function GetHelpForm() {
  const { org, orgId, isLoading: orgLoading } = useOrg();
  const { data: contentData } = useContent();
  const search = useSearch({ strict: false }) as { product?: string };
  const submit = useServerFn(submitForm);
  const createDraft = useServerFn(createDraftSubmission);
  const createUploadUrl = useServerFn(createAttachmentUploadUrl);
  const navigate = useNavigate();

  const orgKnown = !!org;
  const isAdminOrg = !!org && (org.products?.includes("all") ?? false);
  const attachmentsAllowed = orgKnown || orgLoading;
  const partnerOptions = useMemo(() => {
    return Object.values(contentData.orgs)
      .filter((o) => o.id !== "public" && !(o.products?.includes("all") ?? false))
      .map((o) => ({ id: o.id, name: o.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contentData.orgs]);
  const availableProducts = useMemo(() => {
    const allFromContent = Array.from(
      new Set(
        Object.values(contentData.orgs)
          .flatMap((o) => o.products ?? [])
          .filter((slug) => slug && slug !== "all"),
      ),
    );
    if (!orgKnown) {
      return allFromContent.map((slug) => ({ slug, name: productName(slug) }));
    }
    const productSlugs = org!.products?.includes("all")
      ? Array.from(
          new Set(
            Object.values(contentData.orgs)
              .flatMap((o) => o.products ?? [])
              .filter((slug) => slug && slug !== "all"),
          ),
        )
      : (org!.products ?? []);
    return productSlugs.map((slug) => ({ slug, name: productName(slug) }));
  }, [org, orgKnown, contentData.orgs]);

  // Basic info
  const [contactName, setContactName] = useState(org?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(org?.contactEmail ?? "");
  const [partner, setPartner] = useState("");
  const [campus, setCampus] = useState("");
  const [product, setProduct] = useState(search.product ?? "");

  // Path
  const [helpType, setHelpType] = useState<HelpType | "">("");

  // A/D
  const [question, setQuestion] = useState("");

  // E
  const [feedback, setFeedback] = useState("");

  // B
  const [expectedDate, setExpectedDate] = useState<Date | undefined>();
  const [severity, setSeverity] = useState<SubmissionInput["severity"] | "">("");
  const [bComments, setBComments] = useState("");

  // C
  const [shortSummary, setShortSummary] = useState("");
  const [reportDate, setReportDate] = useState<Date | undefined>();
  const [tabAffected, setTabAffected] = useState("");
  const [sectionAffected, setSectionAffected] = useState("");
  const [cComments, setCComments] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastHelpType, setLastHelpType] = useState<HelpType | null>(null);
  const [lastJiraKey, setLastJiraKey] = useState<string | null>(null);
  const [lastJiraUrl, setLastJiraUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    setContactName((current) => current || org.contactName || "");
    setContactEmail((current) => current || org.contactEmail || "");
  }, [org]);

  useEffect(() => {
    const requestedProduct = search.product;
    const requestedIsAvailable = requestedProduct
      ? availableProducts.some((p) => p.slug === requestedProduct)
      : false;
    if (requestedProduct && requestedIsAvailable) {
      setProduct(requestedProduct);
      return;
    }
    if (availableProducts.length === 1) {
      setProduct(availableProducts[0].slug);
      return;
    }
    setProduct((current) =>
      current && availableProducts.some((p) => p.slug === current) ? current : "",
    );
  }, [availableProducts, search.product]);

  const mutation = useMutation({
    mutationFn: (input: SubmissionInput) => submit({ data: input }),
    onSuccess: (data, vars) => {
      setLastHelpType(vars.helpType);
      setLastJiraKey((data as { jiraKey?: string | null }).jiraKey ?? null);
      setLastJiraUrl((data as { jiraUrl?: string | null }).jiraUrl ?? null);
      setConfirmOpen(true);
    },
  });

  async function buildPayload(): Promise<SubmissionInput | null> {
    const basic = z.object({
      contactName: z.string().trim().min(1).max(200),
      contactEmail: z.string().trim().email().max(320),
    });
    const parsed = basic.safeParse({ contactName, contactEmail });
    if (!parsed.success) {
      setError("Please fill out name and a valid email.");
      return null;
    }
    if (!helpType) {
      setError("Please tell us how we can help.");
      return null;
    }
    if (!product.trim()) {
      setError("Please select a product so we can route your request.");
      return null;
    }

    const type: "issue" | "support" =
      helpType === "B" || helpType === "C" ? "issue" : "support";

    const partnerValue = isAdminOrg
      ? partner.trim() || null
      : orgKnown
        ? null
        : partner.trim() || null;
    const productValue = product.trim() || null;

    let summary = "";
    const details: Record<string, string | string[]> = {};
    let sev: SubmissionInput["severity"] | null = null;

    if (helpType === "A" || helpType === "D") {
      if (!question.trim()) {
        setError("Please share your question or comment.");
        return null;
      }
      summary = question.trim();
    } else if (helpType === "E") {
      if (!feedback.trim()) {
        setError("Please share your feedback or request.");
        return null;
      }
      summary = feedback.trim();
    } else if (helpType === "B") {
      if (!expectedDate) {
        setError("Please pick the date this report should have been delivered.");
        return null;
      }
      if (!bComments.trim()) {
        setError("Please add some details about the missing report.");
        return null;
      }
      sev = severity || null;
      summary = `Report missing — expected ${format(expectedDate, "yyyy-MM-dd")}`;
      details.expectedDeliveryDate = format(expectedDate, "yyyy-MM-dd");
      details.comments = bComments.trim();
    } else if (helpType === "C") {
      if (!shortSummary.trim()) {
        setError("Please provide a short summary.");
        return null;
      }
      if (!reportDate) {
        setError("Please pick the date of the report.");
        return null;
      }
      if (!tabAffected.trim()) {
        setError("Please tell us which tab is affected.");
        return null;
      }
      if (!sectionAffected.trim()) {
        setError("Please tell us which section or field is affected.");
        return null;
      }
      if (!severity) {
        setError("Please tell us how blocking this is.");
        return null;
      }
      if (orgKnown && files.length === 0) {
        setError("Please attach at least one screenshot or document.");
        return null;
      }
      sev = severity;
      summary = shortSummary.trim();
      details.reportDate = format(reportDate, "yyyy-MM-dd");
      details.tabAffected = tabAffected.trim();
      details.sectionAffected = sectionAffected.trim();
      if (cComments.trim()) details.comments = cComments.trim();

      // Upload files
      setUploading(true);
      try {
        // Create a short-lived draft submission row so the storage policy will
        // allow uploads into a folder named after that submission id.
        let draftId: string;
        try {
          const res = await createDraft({
            data: { type, contactEmail: contactEmail.trim() },
          });
          draftId = res.id;
        } catch (err) {
          console.error("createDraft failed", err);
          setError("Couldn't prepare upload. Please try again.");
          setUploading(false);
          return null;
        }
        const folder = draftId;
        details.submissionId = draftId;
        const paths: string[] = [];
        for (const file of files) {
          let upload: { path: string; token: string };
          try {
            upload = await createUploadUrl({
              data: {
                submissionId: folder,
                orgId,
                fileName: file.name,
                contentType: file.type || null,
                fileSize: file.size,
              },
            });
          } catch (err) {
            console.error("create upload URL failed", err);
            setError(`Failed to upload ${file.name}: couldn't prepare upload.`);
            setUploading(false);
            return null;
          }
          const { error: upErr } = await supabase.storage
            .from("support-attachments")
            .uploadToSignedUrl(upload.path, upload.token, file, {
              contentType: file.type || undefined,
            });
          if (upErr) {
            setError(`Failed to upload ${file.name}: ${upErr.message}`);
            setUploading(false);
            return null;
          }
          paths.push(upload.path);
        }
        details.attachmentPaths = paths;
      } finally {
        setUploading(false);
      }
    }

    return {
      type,
      helpType,
      orgId: orgId !== "public" ? orgId : null,
      orgName: org?.name ?? null,
      partner: partnerValue,
      campus: campus.trim() || null,
      product: productValue,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      summary,
      severity: sev,
      details: details as Record<string, unknown>,
      submissionId: (details.submissionId as string | undefined) ?? null,
    };
  }

  const confirmationCopy: Record<HelpType, { title: string; body: string }> = {
    A: {
      title: "Thanks for your submission!",
      body: "A team member will be reaching out in 1–2 business days to help you out.",
    },
    B: {
      title: "Thank you for letting us know",
      body: "A team member will be looking into this and responding as soon as possible.",
    },
    C: {
      title: "Thank you for letting us know",
      body: "Our team will review this issue and respond as soon as possible.",
    },
    D: {
      title: "Thanks for your submission!",
      body: "A team member will be reaching out in 1–2 business days to help you out.",
    },
    E: {
      title: "Thanks for your feedback!",
      body: "We've logged your feedback and a team member will review it.",
    },
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F5F7" }}>
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#042C53" }}>Get help</h1>
      <p className="mt-2 text-sm" style={{ color: "#6B6F76" }}>
        Ask a question, report a missing report, or flag a data issue. We typically reply
        within 1–2 business days.
      </p>

      {org && (
        <div
          className="mt-4 rounded-lg border p-3 text-xs"
          style={{ borderColor: "#E2E4E8", backgroundColor: "#FFFFFF", color: "#6B6F76" }}
        >
          Submitting on behalf of{" "}
          <span className="font-medium" style={{ color: "#1A1A1A" }}>{org.name}</span>.
        </div>
      )}

      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          const payload = await buildPayload();
          if (!payload) return;
          mutation.mutate(payload);
        }}
      >
        {/* Basic info */}
        <section
          className="rounded-xl border bg-white px-6 py-5 space-y-4"
          style={{ borderColor: "#E2E4E8" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "#042C53" }}>Basic info</h2>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-[18px]">
            <div>
              <label className={labelClass}>Name{reqStar}</label>
              <input
                className={inputClass}
                style={inputBorder}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className={labelClass}>Email{reqStar}</label>
              <input
                className={inputClass}
                style={inputBorder}
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                maxLength={320}
              />
            </div>
            <div>
              <label className={labelClass}>Partner</label>
              {isAdminOrg ? (
                <select
                  className={inputClass}
                  style={inputBorder}
                  value={partner}
                  onChange={(e) => setPartner(e.target.value)}
                >
                  <option value="">Select a partner</option>
                  {partnerOptions.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : orgKnown ? (
                <input
                  className={inputClass}
                  style={{ ...inputBorder, backgroundColor: "#F4F5F7" }}
                  value={org!.name}
                  readOnly
                />
              ) : (
                <input
                  className={inputClass}
                  style={inputBorder}
                  value={partner}
                  onChange={(e) => setPartner(e.target.value)}
                  maxLength={300}
                  placeholder="Your organization"
                />
              )}
            </div>
            <div>
              <label className={labelClass}>Campus</label>
              <input
                className={inputClass}
                style={inputBorder}
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                maxLength={300}
                placeholder="Campus name"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Product{reqStar}</label>
              <select
                  className={inputClass}
                  style={inputBorder}
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  required
                >
                  <option value="">
                    {availableProducts.length ? "Select a product" : "No products available"}
                  </option>
                  {availableProducts.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
            </div>
          </div>
        </section>

        {/* Help type */}
        <section
          className="rounded-xl border bg-white px-6 py-5 space-y-4 transition-[height] duration-200"
          style={{ borderColor: "#E2E4E8" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "#042C53" }}>
            How can we help you today?
          </h2>
          <select
            className={inputClass}
            style={inputBorder}
            value={helpType}
            onChange={(e) => setHelpType(e.target.value as HelpType | "")}
            required
          >
            <option value="">Select an option</option>
            {HELP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Option A / D */}
          {(helpType === "A" || helpType === "D") && (
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: "#F0F1F3" }}>
              <p className="text-sm" style={{ color: "#6B6F76" }}>
                Our <span className="font-medium" style={{ color: "#1A1A1A" }}>Training</span> tab has
                helpful FAQs and videos. If you can't find your answer there, then let us
                know below. A team member will respond in 1–2 business days to help out.
              </p>
              <div>
                <label className={labelClass}>Your question or comment{reqStar}</label>
                <textarea
                  className={inputClass + " min-h-[140px]"}
                  style={inputBorder}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={5000}
                  required
                />
              </div>
            </div>
          )}

          {/* Option E — Feedback and Requests */}
          {helpType === "E" && (
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: "#F0F1F3" }}>
              <p className="text-sm" style={{ color: "#6B6F76" }}>
                Share feedback, ideas, or feature requests with our team. We'll review
                every submission.
              </p>
              <div>
                <label className={labelClass}>Your feedback or request{reqStar}</label>
                <textarea
                  className={inputClass + " min-h-[140px]"}
                  style={inputBorder}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  maxLength={5000}
                  required
                />
              </div>
            </div>
          )}

          {/* Option B */}
          {helpType === "B" && (
            <div className="space-y-4 pt-4 border-t" style={{ borderColor: "#F0F1F3" }}>
              <div>
                <label className={labelClass}>
                  What date should this report have been delivered?{reqStar}
                </label>
                <DatePickerField value={expectedDate} onChange={setExpectedDate} />
              </div>
              <div>
                <label className={labelClass}>How is this affecting your work?</label>
                <select
                  className={inputClass}
                  style={inputBorder}
                  value={severity ?? ""}
                  onChange={(e) =>
                    setSeverity(e.target.value as SubmissionInput["severity"] | "")
                  }
                >
                  <option value="">Select severity</option>
                  {SEVERITY_OPTIONS.map((o) => (
                    <option key={o.value!} value={o.value!}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Additional details{reqStar}</label>
                <textarea
                  className={inputClass + " min-h-[120px]"}
                  style={inputBorder}
                  value={bComments}
                  onChange={(e) => setBComments(e.target.value)}
                  maxLength={5000}
                  required
                  placeholder="Anything else that helps us track this down"
                />
              </div>
            </div>
          )}

          {/* Option C */}
          {helpType === "C" && (
            <div className="space-y-4 pt-4 border-t" style={{ borderColor: "#F0F1F3" }}>
              <div>
                <label className={labelClass}>Short summary of the issue{reqStar}</label>
                <input
                  className={inputClass}
                  style={inputBorder}
                  value={shortSummary}
                  onChange={(e) => setShortSummary(e.target.value)}
                  maxLength={300}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Date of report{reqStar}</label>
                <DatePickerField value={reportDate} onChange={setReportDate} />
              </div>
              <div>
                <label className={labelClass}>Which tab is affected?{reqStar}</label>
                <input
                  className={inputClass}
                  style={inputBorder}
                  value={tabAffected}
                  onChange={(e) => setTabAffected(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Which section / field is affected?{reqStar}</label>
                <input
                  className={inputClass}
                  style={inputBorder}
                  value={sectionAffected}
                  onChange={(e) => setSectionAffected(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Other comments</label>
                <textarea
                  className={inputClass + " min-h-[100px]"}
                  style={inputBorder}
                  value={cComments}
                  onChange={(e) => setCComments(e.target.value)}
                  maxLength={5000}
                />
              </div>
              <div>
                <label className={labelClass}>How is this affecting your work?{reqStar}</label>
                <select
                  className={inputClass}
                  style={inputBorder}
                  value={severity ?? ""}
                  onChange={(e) =>
                    setSeverity(e.target.value as SubmissionInput["severity"] | "")
                  }
                  required
                >
                  <option value="">Select severity</option>
                  {SEVERITY_OPTIONS.map((o) => (
                    <option key={o.value!} value={o.value!}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Attachments (screenshots / documents){attachmentsAllowed ? reqStar : null}
                </label>
                <input
                  type="file"
                  multiple
                  disabled={!attachmentsAllowed}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#185FA5] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#13507f] disabled:cursor-not-allowed disabled:opacity-50 disabled:file:bg-[#9CA3AF] disabled:hover:file:bg-[#9CA3AF]"
                  onChange={(e) => {
                    if (!attachmentsAllowed) return;
                    const picked = Array.from(e.target.files ?? []);
                    const tooBig = picked.find((f) => f.size > 10 * 1024 * 1024);
                    if (tooBig) {
                      setError(`"${tooBig.name}" is larger than 10MB.`);
                      return;
                    }
                    const total = [...files, ...picked].reduce((s, f) => s + f.size, 0);
                    if (total > 25 * 1024 * 1024) {
                      setError("Total attachments exceed 25MB.");
                      return;
                    }
                    setError(null);
                    setFiles((prev) => [...prev, ...picked]);
                    e.target.value = "";
                  }}
                />
                {!attachmentsAllowed && (
                  <p className="mt-2 text-xs" style={{ color: "#6B6F76" }}>
                    Only verified partners are allowed to add attachments.
                  </p>
                )}
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {files.map((f, idx) => (
                      <li
                        key={`${f.name}-${idx}`}
                        className="flex items-center justify-between rounded border bg-white px-2 py-1"
                        style={{ borderColor: "#E2E4E8" }}
                      >
                        <span className="truncate" style={{ color: "#1A1A1A" }}>
                          {f.name}{" "}
                          <span style={{ color: "#6B6F76" }}>({Math.round(f.size / 1024)} KB)</span>
                        </span>
                        <button
                          type="button"
                          className="text-xs text-destructive hover:underline"
                          onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {mutation.isError && (
          <p className="text-sm text-destructive">
            Something went wrong submitting the form. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || uploading}
          className="rounded-lg px-[22px] py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-60"
          style={{ backgroundColor: "#185FA5" }}
        >
          {uploading ? "Uploading…" : mutation.isPending ? "Submitting…" : "Submit request"}
        </button>
      </form>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) navigate({ to: "/" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lastHelpType ? confirmationCopy[lastHelpType].title : "Thanks!"}
            </DialogTitle>
            <DialogDescription>
              {lastHelpType ? confirmationCopy[lastHelpType].body : ""}
            </DialogDescription>
          </DialogHeader>
          {lastJiraKey && (
            <div
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "#E2E4E8", backgroundColor: "#F4F5F7", color: "#1A1A1A" }}
            >
              Tracking ID:{" "}
              {lastJiraUrl ? (
                <a
                  href={lastJiraUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline"
                  style={{ color: "#185FA5" }}
                >
                  {lastJiraKey}
                </a>
              ) : (
                <span className="font-semibold">{lastJiraKey}</span>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                navigate({ to: "/" });
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}