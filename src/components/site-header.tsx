import { Link, useSearch } from "@tanstack/react-router";
import { useOrg } from "@/hooks/use-org";
import emcLogo from "@/assets/emc-logo.jpg.asset.json";

export function SiteHeader() {
  const { org, isLoading } = useOrg();
  const search = useSearch({ strict: false }) as { org?: string };
  const requestedOrg = search.org ?? null;

  const navClass =
    "text-sm font-medium transition-colors hover:text-white";
  const activeClass = "text-sm font-medium text-white";

  return (
    <header className="sticky top-0 z-10" style={{ backgroundColor: "#042C53" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={emcLogo.url}
            alt="Economic Mobility Center"
            className="h-8 w-8 rounded-full object-cover bg-white"
          />
          <span className="text-[15px] font-medium text-white">EMC Support</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-5">
            <Link
              to="/training"
              className={navClass}
              style={{ color: "#B5D4F4" }}
              activeProps={{ className: activeClass }}
            >
              Training
            </Link>
            <Link
              to="/get-help"
              className={navClass}
              style={{ color: "#B5D4F4" }}
              activeProps={{ className: activeClass }}
            >
              Get help
            </Link>
          </nav>
          <div className="text-right min-w-[120px] leading-tight">
            {isLoading ? (
              <span className="text-[11px]" style={{ color: "#85B7EB" }}>
                Loading…
              </span>
            ) : org ? (
              <>
                <div className="text-[13px] text-white">{org.name}</div>
                <div className="text-[11px]" style={{ color: "#85B7EB" }}>
                  Signed in via link
                </div>
              </>
            ) : requestedOrg ? (
              <>
                <div className="text-[13px] text-white">{requestedOrg}</div>
                <div className="text-[11px]" style={{ color: "#85B7EB" }}>
                  Signed in via link
                </div>
              </>
            ) : (
              <div className="text-[13px] text-white">Public user</div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}