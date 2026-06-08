import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Org = {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  products: string[];
};

// STUB: replace the body of fetchOrgFromExternalApi() when your org API is ready.
// The shape returned must match the Org type above. Read endpoint/key from env:
//   process.env.ORG_API_URL, process.env.ORG_API_KEY
const MOCK_ORGS: Record<string, Org> = {
  "acme-123": {
    id: "acme-123",
    name: "Acme Corp",
    contactName: "Jane Doe",
    contactEmail: "jane@acme.example",
    products: ["invoicer", "budget-pro"],
  },
  "globex-456": {
    id: "globex-456",
    name: "Globex",
    contactName: "John Smith",
    contactEmail: "john@globex.example",
    products: ["forecaster", "data-cleaner", "invoicer"],
  },
  "initech-789": {
    id: "initech-789",
    name: "Initech",
    products: ["budget-pro"],
  },
};

async function fetchOrgFromExternalApi(orgId: string): Promise<Org | null> {
  const url = process.env.ORG_API_URL;
  if (!url) {
    // No external API configured yet — fall back to mock data so the app works end-to-end.
    return MOCK_ORGS[orgId] ?? null;
  }
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${encodeURIComponent(orgId)}`, {
      headers: process.env.ORG_API_KEY
        ? { Authorization: `Bearer ${process.env.ORG_API_KEY}` }
        : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as Org;
  } catch (err) {
    console.error("Org API lookup failed", err);
    return null;
  }
}

export const getOrg = createServerFn({ method: "GET" })
  .inputValidator((data: { orgId: string }) =>
    z.object({ orgId: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const org = await fetchOrgFromExternalApi(data.orgId);
    return { org };
  });