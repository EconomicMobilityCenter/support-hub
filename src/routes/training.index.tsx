import { createFileRoute, Link } from "@tanstack/react-router";
import { useOrg } from "@/hooks/use-org";
import { getArticlesForProducts } from "@/lib/training-content";
import { productName } from "@/lib/products";

export const Route = createFileRoute("/training/")({
  head: () => ({
    meta: [
      { title: "Training — Support Center" },
      { name: "description", content: "Guides and walkthroughs for your products." },
    ],
  }),
  component: TrainingIndex,
});

function TrainingIndex() {
  const { org, orgId } = useOrg();
  const articles = getArticlesForProducts(org ? org.products : null);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Training</h1>
        <p className="text-muted-foreground">
          {org
            ? `Showing material for ${org.name}'s products.`
            : orgId
              ? "Unknown organization — showing all public training material."
              : "Showing all public training material."}
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="text-muted-foreground">No training material is available for your products yet.</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link
                to="/training/$slug"
                params={{ slug: a.slug }}
                className="block rounded-lg border border-border bg-card p-5 hover:bg-accent transition-colors"
              >
                <div className="font-semibold">{a.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{a.description}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.products.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                    >
                      {productName(p)}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}