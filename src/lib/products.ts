// Master product catalog. Keep slugs stable — these are the IDs used in
// org entitlements, content frontmatter, and the `?product=` URL param.
export const PRODUCTS = [
  { slug: "invoicer", name: "Invoicer" },
  { slug: "budget-pro", name: "Budget Pro" },
  { slug: "forecaster", name: "Forecaster" },
  { slug: "data-cleaner", name: "Data Cleaner" },
  { slug: "ccmr-weekly-workbook", name: "CCMR Weekly Workbook" },
] as const;

export type ProductSlug = (typeof PRODUCTS)[number]["slug"];

export function productName(slug: string): string {
  const known = PRODUCTS.find((p) => p.slug === slug)?.name;
  if (known) return known;
  return slug
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}