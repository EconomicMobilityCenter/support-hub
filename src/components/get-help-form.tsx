import { useState } from "react";
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
import { PRODUCTS, productName } from "@/lib/products";
import { submitForm, type SubmissionInput } from "@/lib/submissions.functions";

type HelpType = "A" | "B" | "C" | "D";

const HELP_OPTIONS: { value: HelpType; label: string }[] = [
  { value: "A", label: "I have a question" },
  { value: "B", label: "My report wasn't delivered" },
  { value: "C", label: "Data is missing or looks wrong" },
  { value: "D", label: "Other" },
];

const SEVERITY_OPTIONS: { value: SubmissionInput["severity"]; label: string }[] = [
  { value: "nice_to_have", label: "Minor — something looks off, but I can keep working" },
  { value: "workaround", label: "Moderate — I can work around it for now" },
  { value: "blocking", label: "Major — I'm stuck on something I need to do" },
  { value: "urgent", label: "Critical — this is stopping multiple people from working" },
];

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const labelClass = "block text-sm font-medium mb-1";

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
  const { org, orgId } = useOrg();
  const search = useSearch({ strict: false }) as { product?: string };
  const submit = useServerFn(submitForm);
  const navigate = useNavigate();

  const orgKnown = !!org;
  const availableProducts = orgKnown
    ? (org!.products ?? []).map((slug) => ({ slug, name: productName(slug) }))
    : PRODUCTS.map((p) => ({ slug: p.slug, name: p.name }));

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

  // B
  const [expectedDate, setExpectedDate] = useState<Date | undefined>();
  const [severity, setSeverity] = useState<SubmissionInput["severity"] | "">("");

  // C
  const [shortSummary, setShortSummary] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [steps, setSteps] = useState("");
  const [attachments, setAttachments] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastHelpType, setLastHelpType] = useState<HelpType | null>(null);

  const mutation = useMutation({
    mutationFn: (input: SubmissionInput) => submit({ data: input }),
    onSuccess: (_data, vars) => {
      setLastHelpType(vars.helpType);
      setConfirmOpen(true);
    },
  });

  function buildPayload(): SubmissionInput | null {
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

    const type: "issue" | "support" =
      helpType === "B" || helpType === "C" ? "issue" : "support";

    const partnerValue = orgKnown ? null : partner.trim() || null;
    const productValue = product.trim() || null;

    let summary = "";
    const details: Record<string, string> = {};
    let sev: SubmissionInput["severity"] | null = null;

    if (helpType === "A" || helpType === "D") {
      if (!question.trim()) {
        setError("Please share your question or comment.");
        return null;
      }
      summary = question.trim();
    } else if (helpType === "B") {
      if (!expectedDate) {
        setError("Please pick the date this report should have been delivered.");
        return null;
      }
      if (!severity) {
        setError("Please tell us how blocking this is.");
        return null;
      }
      sev = severity;
      summary = `Report missing — expected ${format(expectedDate, "yyyy-MM-dd")}`;
      details.expectedDeliveryDate = format(expectedDate, "yyyy-MM-dd");
    } else if (helpType === "C") {
      if (!shortSummary.trim()) {
        setError("Please provide a short summary.");
        return null;
      }
      if (!whatHappened.trim()) {
        setError("Please describe what happened vs what you expected.");
        return null;
      }
      if (!severity) {
        setError("Please tell us how blocking this is.");
        return null;
      }
      sev = severity;
      summary = shortSummary.trim();
      details.whatHappened = whatHappened.trim();
      if (steps.trim()) details.stepsToReproduce = steps.trim();
      if (attachments.trim()) details.attachmentLinks = attachments.trim();
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
      details,
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
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#00005c]">Get Help</h1>
      <p className="mt-2 text-muted-foreground">
        Ask a question, report a missing report, or flag a data issue. We typically reply
        within 1–2 business days.
      </p>

      {org && (
        <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Submitting on behalf of{" "}
          <span className="text-foreground font-medium">{org.name}</span>.
        </div>
      )}

      <form
        className="mt-8 space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const payload = buildPayload();
          if (!payload) return;
          mutation.mutate(payload);
        }}
      >
        {/* Basic info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Basic info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Name *</label>
              <input
                className={inputClass}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input
                className={inputClass}
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                maxLength={320}
              />
            </div>
            <div>
              <label className={labelClass}>Partner</label>
              {orgKnown ? (
                <input
                  className={inputClass + " bg-muted/30"}
                  value={org!.name}
                  readOnly
                />
              ) : (
                <input
                  className={inputClass}
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
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                maxLength={300}
                placeholder="Campus name"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Product</label>
              {orgKnown ? (
                <select
                  className={inputClass}
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
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
              ) : (
                <input
                  className={inputClass}
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  maxLength={200}
                  placeholder="Product name"
                />
              )}
            </div>
          </div>
        </section>

        {/* Help type */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">How can we help you today?</h2>
          <select
            className={inputClass}
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
            <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                Our <span className="font-medium text-foreground">Training</span> tab has
                helpful FAQs and videos. If you can't find your answer there, then let us
                know below. A team member will respond in 1–2 business days to help out.
              </p>
              <div>
                <label className={labelClass}>Your question or comment *</label>
                <textarea
                  className={inputClass + " min-h-[140px]"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={5000}
                  required
                />
              </div>
            </div>
          )}

          {/* Option B */}
          {helpType === "B" && (
            <div className="space-y-4 rounded-md border border-border bg-muted/20 p-4">
              <div>
                <label className={labelClass}>
                  What date should this report have been delivered? *
                </label>
                <DatePickerField value={expectedDate} onChange={setExpectedDate} />
              </div>
              <div>
                <label className={labelClass}>How is this affecting your work? *</label>
                <select
                  className={inputClass}
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
            </div>
          )}

          {/* Option C */}
          {helpType === "C" && (
            <div className="space-y-4 rounded-md border border-border bg-muted/20 p-4">
              <div>
                <label className={labelClass}>Short summary of the issue *</label>
                <input
                  className={inputClass}
                  value={shortSummary}
                  onChange={(e) => setShortSummary(e.target.value)}
                  maxLength={300}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>What happened / what did you expect? *</label>
                <textarea
                  className={inputClass + " min-h-[120px]"}
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  maxLength={5000}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Do you have specific steps to reproduce this?</label>
                <textarea
                  className={inputClass + " min-h-[100px]"}
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  maxLength={5000}
                  placeholder={"1. Open …\n2. Click …\n3. …"}
                />
              </div>
              <div>
                <label className={labelClass}>How is this affecting your work? *</label>
                <select
                  className={inputClass}
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
                <label className={labelClass}>Attachment links (screenshots / files)</label>
                <input
                  className={inputClass}
                  value={attachments}
                  onChange={(e) => setAttachments(e.target.value)}
                  maxLength={1000}
                  placeholder="Paste shareable links (Drive, OneDrive, etc.)"
                />
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

        <Button type="submit" disabled={mutation.isPending} size="lg">
          {mutation.isPending ? "Submitting…" : "Submit"}
        </Button>
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
  );
}