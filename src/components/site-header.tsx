import { Link } from "@tanstack/react-router";
import { useOrg } from "@/hooks/use-org";

export function SiteHeader() {
  const { org, orgId, isLoading } = useOrg();

  const navClass = "text-sm text-muted-foreground hover:text-foreground transition-colors";
  const activeClass = "text-sm font-medium text-foreground";

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="font-semibold tracking-tight">
          Support Center
        </Link>
        <nav className="flex items-center gap-5">
          <Link
            to="/training"
            className={navClass}
            activeProps={{ className: activeClass }}
          >
            Training
          </Link>
          <Link
            to="/report-issue"
            className={navClass}
            activeProps={{ className: activeClass }}
          >
            Report an issue
          </Link>
          <Link
            to="/support"
            className={navClass}
            activeProps={{ className: activeClass }}
          >
            Get support
          </Link>
        </nav>
        <div className="text-right text-xs text-muted-foreground min-w-[120px]">
          {isLoading ? (
            "Loading…"
          ) : org ? (
            <>
              <div className="text-foreground font-medium">{org.name}</div>
              <div>Signed-in via link</div>
            </>
          ) : orgId ? (
            <>
              <div className="text-foreground">Unknown org</div>
              <div>Showing public content</div>
            </>
          ) : (
            <div>Public visitor</div>
          )}
        </div>
      </div>
    </header>
  );
}