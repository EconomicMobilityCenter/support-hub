import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrg } from "@/hooks/use-org";
import { useContent } from "@/hooks/use-content";
import type { ContentItem } from "@/lib/content.functions";

export const Route = createFileRoute("/training/")({
  head: () => ({
    meta: [
      { title: "Training — EMC Support" },
      { name: "description", content: "Guides and walkthroughs for your products." },
    ],
  }),
  component: TrainingIndex,
});

function renderMarkdown(body: string): string {
  const html = marked.parse(body, { async: false }) as string;
  const ALLOWED_IFRAME_HOSTS = new Set([
    "player.vimeo.com",
    "www.youtube.com",
    "youtube.com",
    "www.youtube-nocookie.com",
    "youtube-nocookie.com",
  ]);
  DOMPurify.removeAllHooks();
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName !== "iframe") return;
    const src = (node as Element).getAttribute("src") ?? "";
    try {
      const host = new URL(src).hostname;
      if (!ALLOWED_IFRAME_HOSTS.has(host)) {
        (node as Element).remove();
      }
    } catch {
      (node as Element).remove();
    }
  });
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: [
      "allow",
      "allowfullscreen",
      "frameborder",
      "scrolling",
      "referrerpolicy",
      "title",
    ],
  });
}

function TrainingIndex() {
  const { orgId } = useOrg();
  const { data, isLoading, error } = useContent();
  const [active, setActive] = useState<ContentItem | null>(null);
  const activeHtml = useMemo(
    () => (active ? renderMarkdown(active.body) : ""),
    [active],
  );

  const groups = useMemo(() => {
    const orgProducts = data.orgs[orgId]?.products ?? [];
    const isAdmin = orgProducts.includes("all");
    const allowedProducts = new Set(orgProducts);
    const visible = data.items.filter((it) => {
      if (it.category !== "Training" || it.published === false) return false;
      if (isAdmin) return true;
      if (it.product) return allowedProducts.has(it.product);
      // Backward-compat: items without a product field fall back to orgs matching.
      return it.orgs.includes(orgId) || it.orgs.includes("all");
    });
    const byGroup = new Map<string, ContentItem[]>();
    for (const it of visible) {
      const arr = byGroup.get(it.group) ?? [];
      arr.push(it);
      byGroup.set(it.group, arr);
    }
    return Array.from(byGroup.entries())
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => a.order - b.order),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.items, data.orgs, orgId]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F5F7" }}>
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-6">
        <header className="space-y-1">
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: "#042C53" }}
          >
            Training
          </h1>
          <p className="text-sm" style={{ color: "#6B6F76" }}>
            Step-by-step guides and videos for each product.
          </p>
        </header>

        {isLoading && (
          <p className="text-sm" style={{ color: "#6B6F76" }}>
            Loading training material…
          </p>
        )}
        {error && !isLoading && (
          <p className="text-sm text-destructive">Couldn't load content: {error}</p>
        )}
        {!isLoading && !error && groups.length === 0 && (
          <p className="text-sm" style={{ color: "#6B6F76" }}>
            No training material available for your organization yet.
          </p>
        )}

        <div className="space-y-3">
          {groups.map((g) => (
            <Collapsible
              key={g.name}
              defaultOpen={g.items.length < 5}
              className="rounded-xl border bg-card overflow-hidden"
              style={{ borderColor: "#E2E4E8" }}
            >
              <CollapsibleTrigger className="group flex w-full items-center justify-between px-5 py-4 text-left">
                <span
                  className="text-base font-semibold"
                  style={{ color: "#042C53" }}
                >
                  {g.name}
                </span>
                <ChevronDown
                  className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"
                  style={{ color: "#8A8E96" }}
                />
              </CollapsibleTrigger>
              <CollapsibleContent
                className="border-t"
                style={{ borderColor: "#F0F1F3" }}
              >
                <ul>
                  {g.items.map((it, idx) => (
                    <li
                      key={it.slug}
                      style={{
                        borderTop: idx === 0 ? "none" : "1px solid #F0F1F3",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setActive(it)}
                        className="w-full text-left py-3 transition-colors hover:bg-[#F4F5F7] text-sm hover:underline"
                        style={{ color: "#185FA5", paddingLeft: 36, paddingRight: 18 }}
                      >
                        {it.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[#00005c]">{active?.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: activeHtml }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}