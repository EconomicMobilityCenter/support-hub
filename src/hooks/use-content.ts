import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getContent, type ContentBundle } from "@/lib/content.functions";

const EMPTY: ContentBundle = { items: [], orgs: {} };

export function useContent(): { data: ContentBundle; isLoading: boolean; error: string | null } {
  const fetchContent = useServerFn(getContent);
  const query = useQuery({
    queryKey: ["content"],
    queryFn: () => fetchContent(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return {
    data: query.data ?? EMPTY,
    isLoading: query.isLoading,
    error: query.data?.error ?? (query.error ? String(query.error) : null),
  };
}