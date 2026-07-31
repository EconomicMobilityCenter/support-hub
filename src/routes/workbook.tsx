import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { productName } from "@/lib/products";

export const Route = createFileRoute("/workbook")({
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === "string" ? search.url : "",
    org: typeof search.org === "string" ? search.org : undefined,
    product: typeof search.product === "string" ? search.product : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Workbook Viewer — EMC Support" },
      { name: "description", content: "View your organization's live workbook inside the EMC support portal." },
      { property: "og:title", content: "Workbook Viewer — EMC Support" },
      { property: "og:description", content: "View your organization's live workbook inside the EMC support portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkbookPage,
});

function isSafeUrl(url: string): boolean {
  return /^https:\/\//i.test(url);
}

function WorkbookPage() {
  const { url, product } = Route.useSearch();
  const title = product ? productName(product) : "Workbook";
  const valid = Boolean(url) && isSafeUrl(url);

  return (
    <div className="bg-[#F4F5F7] min-h-screen">
      <div className="w-full px-3 py-4 space-y-3 sm:px-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "#1A1A1A" }}>
              {title}
            </h1>
            <p className="text-sm" style={{ color: "#6B6F76" }}>
              Live workbook view
            </p>
          </div>
          <Link
            to="/"
            search={(prev: Record<string, unknown>) => ({ org: prev.org })}
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: "#185FA5" }}
          >
            <ArrowLeft className="size-4" /> Back
          </Link>
        </div>

        {valid ? (
          <div
            className="overflow-hidden rounded-xl border bg-card"
            style={{ borderColor: "#E2E4E8" }}
          >
            <iframe
              src={url}
              title={title}
              className="w-full"
              style={{ height: "calc(100vh - 150px)", minHeight: 600, border: "none" }}
              allowFullScreen
            />
          </div>
        ) : (
          <div
            className="rounded-xl border bg-card p-8 text-center space-y-2"
            style={{ borderColor: "#E2E4E8" }}
          >
            <div className="text-base font-bold" style={{ color: "#1A1A1A" }}>
              No workbook link
            </div>
            <p className="text-sm" style={{ color: "#6B6F76" }}>
              No workbook link is configured for this product yet. Please contact support and we'll
              get it set up.
            </p>
            <Link
              to="/get-help"
              search={(prev: Record<string, unknown>) => ({ org: prev.org })}
              className="inline-block text-sm font-medium"
              style={{ color: "#185FA5" }}
            >
              Contact support →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
