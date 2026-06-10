import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, Table2 } from "lucide-react";
import { useOrg } from "@/hooks/use-org";
import { productName } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EMC Support" },
      { name: "description", content: "Training, support, and issue reporting for our Excel products." },
    ],
  }),
  component: Index,
});

function Index() {
  const { org, orgId } = useOrg();
  const products: string[] = org?.products ?? [];

  return (
    <div className="bg-[#F4F5F7] min-h-screen">
      <section className="w-full bg-[#185FA5] pt-16 pb-28">
        <div className="mx-auto max-w-6xl px-6 space-y-2 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            {org
              ? `How can we help, ${org.name}?`
              : orgId
                ? "How can we help?"
                : "How can we help?"}
          </h1>
          <p className="text-sm text-[#B5D4F4]">
            {org || orgId
              ? "Pick a section below to get started."
              : "Browse training material or contact our team."}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-16 space-y-6 -mt-10">
        <section className="grid gap-4 sm:grid-cols-2">
          <ActionCard
            to="/training"
            title="Training"
            desc="Step-by-step guides for each product."
            cta="Browse guides"
            icon={<BookOpen className="size-5" style={{ color: "#185FA5" }} />}
          />
          <ActionCard
            to="/get-help"
            title="Get help"
            desc="Ask a question or report an issue."
            cta="Start a request"
            icon={<LifeBuoy className="size-5" style={{ color: "#185FA5" }} />}
          />
        </section>

        {org && (
          <section className="rounded-xl border bg-card p-5" style={{ borderColor: "#E2E4E8" }}>
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "#8A8E96", letterSpacing: "0.08em" }}
              >
                Your products
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: "#E6F1FB", color: "#185FA5" }}
              >
                Linked access
              </span>
            </div>
            {products.length === 0 ? (
              <p className="text-sm" style={{ color: "#6B6F76" }}>
                No products are associated with this organization yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {products.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{ backgroundColor: "#F4F5F7" }}
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg"
                      style={{ backgroundColor: "#042C53" }}
                    >
                      <Table2 className="size-4" style={{ color: "#85B7EB" }} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium" style={{ color: "#1A1A1A" }}>
                        {productName(p)}
                      </div>
                      <div className="text-xs" style={{ color: "#6B6F76" }}>
                        Your district's active product.
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  to,
  title,
  desc,
  cta,
  icon,
}: {
  to: "/training" | "/get-help";
  title: string;
  desc: string;
  cta: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm"
      style={{ borderColor: "#E2E4E8" }}
    >
      <div
        className="grid size-10 place-items-center rounded-lg mb-4"
        style={{ backgroundColor: "#E6F1FB" }}
      >
        {icon}
      </div>
      <div className="text-base font-bold mb-1" style={{ color: "#1A1A1A" }}>
        {title}
      </div>
      <div className="text-sm mb-4" style={{ color: "#6B6F76" }}>
        {desc}
      </div>
      <div className="text-sm font-medium" style={{ color: "#185FA5" }}>
        {cta} →
      </div>
    </Link>
  );
}