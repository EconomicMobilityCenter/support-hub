const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SPREADSHEET_ID = "1wPynzW8YlYkol956ymhTyRE5bwWxLr8_CL7L0TIbiWw";
// Tab whose gid is 1572056046.
const SHEET_TAB = "Raw Form Responses";

export interface FeedbackRow {
  timestamp: string;
  name: string;
  partner: string;
  email: string;
  priority: string;
  description: string;
}

export async function appendFeedbackRow(row: FeedbackRow): Promise<void> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !sheetsKey) {
    throw new Error("Missing Google Sheets connector credentials");
  }

  const range = `${SHEET_TAB}!A:F`;
  const url = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    range,
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": sheetsKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [
        [
          row.timestamp,
          row.name,
          row.partner,
          row.email,
          row.priority,
          row.description,
        ],
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Google Sheets append failed (${res.status}): ${body.slice(0, 500)}`,
    );
  }
}