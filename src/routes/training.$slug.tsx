import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getArticle, renderArticleBody } from "@/lib/training-content";
import { productName } from "@/lib/products";

export const Route = createFileRoute("/training/$slug")({
  loader: ({ params }) => {
    const article = getArticle(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.article.title} — Support Center` },
            { name: "description", content: loaderData.article.description },
          ],
        }
      : {},
  component: ArticlePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Article not found</h1>
      <p className="mt-2 text-muted-foreground">It may have been moved or removed.</p>
      <Link to="/training" className="inline-block mt-4 text-primary underline">
        Back to training
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Couldn't load this article</h1>
      <p className="mt-2 text-muted-foreground text-sm">{error.message}</p>
      <button onClick={reset} className="mt-4 text-primary underline">Try again</button>
    </div>
  ),
});

function ArticlePage() {
  const { article } = Route.useLoaderData();
  const blocks = renderArticleBody(article.body);

  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/training" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to training
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{article.title}</h1>
      <p className="mt-2 text-muted-foreground">{article.description}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {article.products.map((p) => (
          <span
            key={p}
            className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
          >
            {productName(p)}
          </span>
        ))}
      </div>

      <div className="mt-8 space-y-5">
        {blocks.map((b, i) => {
          if (b.kind === "h") {
            return (
              <h2 key={i} className="text-xl font-semibold mt-6">
                {b.text}
              </h2>
            );
          }
          if (b.kind === "ul") {
            return (
              <ul key={i} className="list-disc pl-5 space-y-1 text-foreground/90">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="leading-relaxed text-foreground/90">
              {b.text}
            </p>
          );
        })}
      </div>
    </article>
  );
}