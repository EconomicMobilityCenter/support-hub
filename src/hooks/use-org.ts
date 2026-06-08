import { useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getOrg, type Org } from "@/lib/org.functions";

export function useOrg(): {
  orgId: string | null;
  org: Org | null;
  isLoading: boolean;
} {
  // strict: false so this hook works on any route.
  const search = useSearch({ strict: false }) as { org?: string };
  const orgId = search.org ?? null;
  const fetchOrg = useServerFn(getOrg);

  const query = useQuery({
    queryKey: ["org", orgId],
    queryFn: () => fetchOrg({ data: { orgId: orgId! } }),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    orgId,
    org: query.data?.org ?? null,
    isLoading: !!orgId && query.isLoading,
  };
}