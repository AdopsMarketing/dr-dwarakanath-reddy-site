# Keystatic dashboard — onboarding for the next dev

This is a handover for a Keystatic CMS that's already wired up and working in production on an Astro + Vercel site. The goal of this doc is to spare you (and your Claude Code) from re-deriving the things that were non-obvious the first time.

Read this before you touch `keystatic.config.ts`, `astro.config.mjs`, or anything under `src/content/`.

---

## Stack snapshot

- **Astro 5** static site, deployed to **Vercel**
- **Keystatic 0.5.50** (`@keystatic/astro` + `@keystatic/core`) for the editor UI
- **Content collections** live under `src/content/{blogs,services,doctors,...}` as `.mdoc` (Markdoc) files
- **Zod schemas** in `src/content.config.ts` are the source of truth that Astro validates against at build time
- **Keystatic schemas** in `keystatic.config.ts` are the editor UI — they **mirror** the Zod schemas

If you change a field in one place and not the other, **the build breaks**. They're coupled. Plan edits in both files in the same change.

---

## The 10 things that bit us. Don't re-learn them.

### 1. Storage mode must use `import.meta.env.PROD`, not `process.env`

```ts
const useGitHubStorage = import.meta.env.PROD;

storage: useGitHubStorage
  ? { kind: 'github', repo: { owner: '<owner>', name: '<repo>' } }
  : { kind: 'local' },
```

Keystatic's admin UI is a **client-side React bundle**. `process.env.NODE_ENV` is not reliably inlined there — Vite/Astro replace `import.meta.env.PROD` at build time, which is what we need. Using `process.env` will work in dev and silently fall back to local storage in production (i.e. edits would not commit to GitHub).

### 2. React must be scoped to `/keystatic` only

In `astro.config.mjs`:

```ts
react({ include: ['**/keystatic/**'] })
```

Without `include`, React leaks into every page in the static build, blowing up bundle size and adding hydration JS to pages that should stay static HTML. The site is `output: 'static'` — only Keystatic and the contact API are SSR.

### 3. Sitemap must exclude `/keystatic` and `/api/`

```ts
sitemap({ filter: (page) => !page.includes('/keystatic') && !page.includes('/api/') })
```

Otherwise the CMS admin and API routes get sitemapped, which is bad both for SEO and security-by-obscurity.

### 4. Vercel needs `security.allowedDomains` for OAuth

```ts
security: {
  allowedDomains: [{ hostname: '<your-domain>', protocol: 'https' }],
},
```

Without this, the GitHub OAuth callback constructs absolute URLs against `localhost` because SSR doesn't trust `x-forwarded-host` by default. Login appears to work and then redirects to `localhost/...` — broken.

### 5. `fields.conditional` doesn't fit a flat YAML/MDoc frontmatter

We tried using `fields.conditional` for the polymorphic "section" types (prose / list / steps / timeline / faqs). It serialises as `{ discriminant, value }`, which doesn't match the on-disk flat shape that Astro's `z.discriminatedUnion('type', ...)` expects.

**Pattern we use instead**: one flat `fields.object` with **all possible keys** (`body`, `intro`, `items`, `steps`, `entries`, `outro`, `note`, `faqItems`), and a `type` select that tells the renderer which keys to read. See `serviceSections` in `keystatic.config.ts`.

If you reach for `fields.conditional`, you'll spend an afternoon and end up back here.

### 6. FAQ sections need `faqItems`, not `items` — type collision

A list section's `items` is `string[]`. An FAQ section's items are `{question, answer, featured}[]`. They can't share the same field name inside the flat section object — Keystatic can't reconcile the two array shapes.

**Resolved by**: renaming the FAQ array to `faqItems` everywhere (Keystatic schema, Zod schema, content files). The Zod schema keeps `items` as an optional backwards-compat fallback only.

If you see "items" in a FAQ section in a new content file, that's a bug — fix it to `faqItems`.

### 7. Every collection needs `format: { contentField: 'content' }`

```ts
format: { contentField: 'content' },
schema: {
  // ...frontmatter fields...
  content: fields.markdoc({ label: 'Body' }),
}
```

Without `contentField`, Keystatic writes JSON files instead of Markdoc files with frontmatter. The Zod loader is `glob({ pattern: '**/*.{md,mdoc}' })` — JSON files won't be picked up and the editor edit will appear lost.

### 8. `slugField` controls the filename. Pick it once.

Most collections use `slug`. The `doctors` and `locations` collections use `entityKey` because that's also the JSON-LD `@id` anchor — changing it would change the entity identity in the schema graph.

**Don't change `slugField` on an existing collection** unless you're prepared to rename every file on disk. Existing slugs are stable — preserving them is a hard project rule (slug stability beats marginal SEO gains; broken inbound links are forever).

### 9. Singletons use a fixed file path, no glob

```ts
organization: singleton({
  path: 'src/content/organization/main',
  format: { contentField: 'content' },
  schema: { /* ... */ },
})
```

The Zod loader for singletons still uses a `glob('**/*.{md,mdoc,json}', { base: './src/content/organization' })` and reads `main.mdoc`. If you rename the singleton path, also update the Zod side.

### 10. GitHub storage requires an OAuth app — separate from the repo

In production, Keystatic logs editors in via GitHub OAuth. You need:

1. A **GitHub OAuth App** registered (Settings → Developer settings → OAuth Apps)
2. `KEYSTATIC_GITHUB_CLIENT_ID` and `KEYSTATIC_GITHUB_CLIENT_SECRET` set in Vercel env vars
3. Authorization callback URL: `https://<your-domain>/api/keystatic/github/oauth/callback`
4. The OAuth app must be installed on the org that owns the repo

Without all four, login redirects in a loop or 404s on the callback. There's no helpful error — check the OAuth app's "last used" timestamp to confirm it's even being hit.

---

## File map

```
keystatic.config.ts          # Editor schemas. Mirror of content.config.ts.
src/content.config.ts        # Zod schemas. Build-time source of truth.
src/content/<collection>/    # Markdoc files. One file per entry.
astro.config.mjs             # React scoping, sitemap filter, security config.
src/pages/api/keystatic/     # OAuth callback routes (auto-generated by integration)
```

The Keystatic admin mounts at `/keystatic` — there's no page file for it. It's served by the `@keystatic/astro` integration.

---

## When you add a new field

1. Add it to the Zod schema in `src/content.config.ts` (mark optional unless you backfill all files)
2. Add it to the matching Keystatic schema in `keystatic.config.ts`
3. Run `astro check` — both schemas must compile clean
4. If the field affects rendered output, update the `.astro` template that consumes it
5. If it affects JSON-LD, update `src/lib/schema.ts` (the single source of schema truth — never inline schema in page templates)

---

## When you add a new collection

1. Define the Zod schema in `src/content.config.ts` and export it from `collections`
2. Define the Keystatic schema in `keystatic.config.ts` under `collections`
3. Add the collection to a `navigation` group in the Keystatic `ui` config so it shows up in the sidebar
4. Create `src/content/<name>/` with at least one seed `.mdoc` file (Keystatic won't show an empty collection cleanly)
5. Add the route under `src/pages/` if it's user-facing

---

## What NOT to do

- ❌ Don't install a Keystatic CMS plugin to "generate schema" — schema is hand-written in `src/lib/schema.ts`
- ❌ Don't add JSON-LD via GTM or inline `<script>` in page templates — single graph per page, from `schema.ts` only
- ❌ Don't change existing URL slugs to chase keywords — slug stability beats marginal SEO
- ❌ Don't use `process.env.PROD` in `keystatic.config.ts` — see #1
- ❌ Don't add a field to one schema file without the other — see preamble
- ❌ Don't reach for `fields.conditional` — see #5

---

## Running locally

```bash
npm install
npm run dev          # astro dev, Keystatic at http://localhost:4321/keystatic
```

In dev, edits write directly to the local `.mdoc` files. Commit them like normal code.

In production, edits go through GitHub OAuth and commit to the repo on the editor's behalf. The site rebuilds on push.

---

## If something is weird

1. Check `astro check` — schema mismatches surface here
2. Check the browser console on `/keystatic` — Keystatic surfaces validation errors there, not server-side
3. Check that the on-disk file shape matches what Keystatic expects — frontmatter key names are case-sensitive
4. If OAuth is broken in prod, check Vercel env vars and the OAuth app's callback URL — see #10

That should cover 90% of what we hit. Good luck.
