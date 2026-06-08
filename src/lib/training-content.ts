// Training content registry. Each article is a plain TS module so it lives
// in version control, gets reviewed in PRs, and renders with project styles.
// Add a new article by adding a new entry below.

export type TrainingArticle = {
  slug: string;
  title: string;
  description: string;
  products: string[]; // product slugs this article is relevant to
  body: string; // markdown-lite: paragraphs separated by blank lines, leading "- " for bullets, leading "# " for headings
  order?: number;
};

export const TRAINING_ARTICLES: TrainingArticle[] = [
  {
    slug: "invoicer-getting-started",
    title: "Getting started with Invoicer",
    description: "Install the add-in, send your first invoice, and learn the ribbon controls.",
    products: ["invoicer"],
    order: 1,
    body: `# Install the add-in

Open Excel and go to Insert → My Add-ins → Invoicer. Sign in with the email your administrator provided.

# Create your first invoice

- Click the Invoicer ribbon tab
- Pick a customer from the dropdown
- Add line items and tax rates
- Press "Send" to email the PDF

# Where invoices are stored

Sent invoices sync to your company workspace within a minute. Use the History panel to find past invoices.`,
  },
  {
    slug: "budget-pro-templates",
    title: "Budget Pro: working with templates",
    description: "Apply, customize, and share budget templates across your team.",
    products: ["budget-pro"],
    order: 1,
    body: `# Applying a template

Open the Budget Pro pane and choose "New from template". Templates are scoped to your organization.

# Customizing

You can rename sections, add new line items, and change currencies. Saved customizations stay local until you publish them.

# Sharing with your team

Click "Publish template" — admins approve before it becomes available to other users.`,
  },
  {
    slug: "forecaster-models",
    title: "Forecaster: building a forecast model",
    description: "Drive predictions from historical data and scenarios.",
    products: ["forecaster"],
    order: 1,
    body: `# Pick your driver columns

Forecaster needs at least one date column and one numeric driver. Highlight the range and click "Use as input".

# Choose a method

- Trend: best for steady growth
- Seasonal: monthly/quarterly cycles
- Custom: bring your own formula

# Saving scenarios

Each scenario is saved to your workspace and can be compared side by side.`,
  },
  {
    slug: "data-cleaner-rules",
    title: "Data Cleaner: writing cleanup rules",
    description: "Standardize messy spreadsheets with reusable rules.",
    products: ["data-cleaner"],
    order: 1,
    body: `# What's a rule?

A rule is a transformation you can re-run on any sheet. Examples: trim whitespace, normalize phone numbers, fix date formats.

# Creating a rule

Select a column → Data Cleaner → "Save selection as rule". Give it a name and pick which columns it applies to.

# Running rules

Run a single rule or apply your whole rule set with one click.`,
  },
  {
    slug: "support-overview",
    title: "How to get help",
    description: "Where to file an issue and how our support team responds.",
    products: ["invoicer", "budget-pro", "forecaster", "data-cleaner"],
    order: 0,
    body: `# Two ways to reach us

- Report an issue: something is broken or behaving unexpectedly
- Get support: questions, how-tos, account requests

# Response times

- Issues: we respond within one business day
- Support requests: we respond within two business days

# What to include

The more detail you give, the faster we can help. Screenshots, exact error messages, and the steps you took before the problem appeared are all useful.`,
  },
];

export function getArticlesForProducts(productSlugs: string[] | null): TrainingArticle[] {
  const set = productSlugs ? new Set(productSlugs) : null;
  const filtered = set
    ? TRAINING_ARTICLES.filter((a) => a.products.some((p) => set.has(p)))
    : TRAINING_ARTICLES;
  return [...filtered].sort(
    (a, b) => (a.order ?? 100) - (b.order ?? 100) || a.title.localeCompare(b.title),
  );
}

export function getArticle(slug: string): TrainingArticle | undefined {
  return TRAINING_ARTICLES.find((a) => a.slug === slug);
}

// Tiny markdown-ish renderer — keeps content readable without adding MDX deps.
export function renderArticleBody(body: string): Array<
  | { kind: "h"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
> {
  const blocks: ReturnType<typeof renderArticleBody> = [];
  const paragraphs = body.split(/\n\s*\n/);
  for (const raw of paragraphs) {
    const para = raw.trim();
    if (!para) continue;
    if (para.startsWith("# ")) {
      blocks.push({ kind: "h", text: para.slice(2).trim() });
    } else if (para.split("\n").every((l) => l.trim().startsWith("- "))) {
      blocks.push({
        kind: "ul",
        items: para.split("\n").map((l) => l.trim().slice(2)),
      });
    } else {
      blocks.push({ kind: "p", text: para.replace(/\n/g, " ") });
    }
  }
  return blocks;
}