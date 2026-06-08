import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useOrg } from "@/hooks/use-org";
import { PRODUCTS } from "@/lib/products";
import { submitForm, type SubmissionInput } from "@/lib/submissions.functions";

type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

export function SubmissionForm({
  type,
  title,
  description,
  extraFields,
}: {
  type: "issue" | "support";
  title: string;
  description: string;
  extraFields: Field[];
}) {
  const { org, orgId } = useOrg();
  const search = useSearch({ strict: false }) as { product?: string };
  const submit = useServerFn(submitForm);

  const availableProducts = org
    ? PRODUCTS.filter((p) => org.products.includes(p.slug))
    : PRODUCTS;

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [product, setProduct] = useState<string>("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Autofill from org / URL once org loads
  useEffect(() => {
    if (org?.contactName && !contactName) setContactName(org.contactName);
    if (org?.contactEmail && !contactEmail) setContactEmail(org.contactEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.contactName, org?.contactEmail]);

  useEffect(() => {
    if (search.product && !product) {
      const exists = availableProducts.some((p) => p.slug === search.product);
      if (exists) setProduct(search.product);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.product, availableProducts.length]);

  const mutation = useMutation({
    mutationFn: (input: SubmissionInput) => submit({ data: input }),
  });

  if (mutation.isSuccess) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center space-y-3">
        <h1 className="text-2xl font-semibold">Thanks — we got it.</h1>
        <p className="text-muted-foreground">
          We've recorded your {type === "issue" ? "issue report" : "support request"} and someone
          from our team will follow up at <span className="text-foreground">{contactEmail}</span>.
        </p>
        <p className="text-xs text-muted-foreground">Reference: {mutation.data?.id}</p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>

      {org && (
        <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Submitting on behalf of <span className="text-foreground font-medium">{org.name}</span>.
        </div>
      )}

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);

          const baseShape = z.object({
            contactName: z.string().trim().min(1, "Required").max(200),
            contactEmail: z.string().trim().email("Invalid email").max(320),
            product: z.string().max(200).optional(),
            summary: z.string().trim().min(1, "Required").max(5000),
          });
          const parsed = baseShape.safeParse({ contactName, contactEmail, product, summary });
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Please fill out required fields.");
            return;
          }

          // Validate extra required fields
          for (const f of extraFields) {
            if (f.required && !(details[f.name] ?? "").trim()) {
              setError(`${f.label} is required.`);
              return;
            }
          }

          mutation.mutate({
            type,
            orgId: orgId ?? null,
            orgName: org?.name ?? null,
            product: product || null,
            contactName,
            contactEmail,
            summary,
            details,
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Your name</label>
            <input
              className={inputClass}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              className={inputClass}
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              maxLength={320}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Product</label>
          <select
            className={inputClass}
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          >
            <option value="">{availableProducts.length ? "Select a product" : "No products available"}</option>
            {availableProducts.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            {type === "issue" ? "Short summary of the issue" : "What do you need help with?"}
          </label>
          <input
            className={inputClass}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            maxLength={300}
            placeholder={type === "issue" ? "e.g. Send button is greyed out" : "e.g. How do I share a template?"}
          />
        </div>

        {extraFields.map((f) => (
          <div key={f.name}>
            <label className={labelClass}>
              {f.label}
              {f.required && <span className="text-destructive"> *</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                className={inputClass + " min-h-[120px]"}
                value={details[f.name] ?? ""}
                onChange={(e) => setDetails((d) => ({ ...d, [f.name]: e.target.value }))}
                maxLength={5000}
                placeholder={f.placeholder}
              />
            ) : f.type === "select" ? (
              <select
                className={inputClass}
                value={details[f.name] ?? ""}
                onChange={(e) => setDetails((d) => ({ ...d, [f.name]: e.target.value }))}
              >
                <option value="">Select…</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputClass}
                value={details[f.name] ?? ""}
                onChange={(e) => setDetails((d) => ({ ...d, [f.name]: e.target.value }))}
                maxLength={500}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {mutation.isError && (
          <p className="text-sm text-destructive">
            Something went wrong submitting the form. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {mutation.isPending ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}