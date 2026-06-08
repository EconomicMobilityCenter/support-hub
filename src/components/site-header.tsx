import { Link } from "@tanstack/react-router";
import { useOrg } from "@/hooks/use-org";
import emcLogo from "@/assets/emc-logo.webp.asset.json";

export function SiteHeader() {
  const { org, orgId, isLoading } = useOrg();

  const navClass =
    "text-sm font-semibold text-[#00005E] hover:text-[#003291] transition-colors";
  const activeClass = "text-sm font-semibold text-[#003291]";

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
        <Link to="/" className="flex items-center gap-3 tracking-tight font-sans font-bold text-[#00005c]">
          <img src={emcLogo.url} alt="Economic Mobility Center" className="h-10 w-auto" />
          <span>EMC Support</span>
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
            to="/get-help"
            className={navClass}
            activeProps={{ className: activeClass }}
          >
            Get Help
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
            null
          )}
        </div>
      </div>
    </header>
  );
}