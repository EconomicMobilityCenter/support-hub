import { useSearch } from "@tanstack/react-router";
import { useContent } from "@/hooks/use-content";
import type { OrgConfig } from "@/lib/content.functions";

export function useOrg(): {
  orgId: string;
  org: OrgConfig | null;
  isLoading: boolean;
} {
  const search = useSearch({ strict: false }) as { org?: string };
  const requested = search.org ?? null;
  const { data, isLoading } = useContent();
  const org = requested ? data.orgs[requested] ?? null : null;
  const orgId = org ? requested! : requested && isLoading ? requested : "public";
  return { orgId, org, isLoading };
}