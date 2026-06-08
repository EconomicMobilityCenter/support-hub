import { createFileRoute, Link } from "@tanstack/react-router";
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
    <div>
      <section className="w-full bg-[#C2EBFF] py-20">
        <div className="mx-auto max-w-3xl px-6 space-y-3 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#003291]">
            How can we help?
          </h1>
          <p className="text-muted-foreground">
            {org
              ? `Welcome, ${org.name}. Pick a section below to get started.`
              : orgId
                ? "We couldn't identify your organization from this link, so you're seeing the public view."
                : "Browse training material or contact our team."}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <section className="grid gap-4 sm:grid-cols-2">
        <Tile to="/training" title="Training" desc="Step-by-step guides for each product." />
        <Tile to="/get-help" title="Get Help" desc="Ask a question or report an issue." />
      </section>

      {org && (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Your products
          </h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products are associated with this organization yet.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {products.map((p) => (
                <li
                  key={p}
                  className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                >
                  {productName(p)}
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

function Tile({ to, title, desc }: { to: "/training" | "/get-help"; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-border bg-card p-5 hover:bg-accent transition-colors"
    >
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </Link>
  );
}