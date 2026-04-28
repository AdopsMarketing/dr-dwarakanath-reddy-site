# Handover guide

This document is the operating manual for the Dr. Dwarakanath Reddy practice website. It covers what the site is, how to edit it, and how to run it day-to-day.

> **Audience:** The agency team handing the site over, plus any technical or non-technical person at the practice who needs to update content.

---

## 1. What the site is

| Stack | Choice | Why |
| --- | --- | --- |
| Framework | Astro 5 | Static-first, fast, no client JS by default |
| Styling | Tailwind CSS v4 | Utility classes via `@theme` in `src/styles/global.css` |
| Content | Markdown + YAML frontmatter (Astro Content Collections) | No database, no CMS server, version-controlled |
| Editing UI | Keystatic (open-source CMS) | Form-based editor at `/keystatic` that writes to the markdown files |
| Hosting | Vercel | Auto-deploys on every push to `main` |
| Repo | `AdopsMarketing/dr-dwarakanath-reddy-site` (GitHub) | Source of truth |
| Email forwarder | Resend (for the contact form) | Transactional email API |

Live URL: `https://gastrosurgeonnellore.com` (once DNS is moved).
Staging URL: `https://dr-dwarakanath-reddy-site.vercel.app`.

---

## 2. Two ways to edit content

### Option A — Keystatic admin (recommended for non-technical users)

Open `/keystatic` on the deployed site (or `http://localhost:4321/keystatic` in local dev). You see a form-based UI with sections for blog posts, FAQs, videos, success stories, and so on. Saving a change creates a Git commit; Vercel rebuilds the site automatically within a minute.

Sections you'll see in the left nav:

- **Patient-facing:** Blogs, Cases, Stories, Videos, FAQs (most-edited content)
- **Practice info:** Doctors, Organization, Locations
- **Procedures:** Services, Categories, Conditions

### Option B — Direct markdown editing (for developers)

Every page section is a `.md` file under `src/content/`. Open the file in any text editor, change the frontmatter or body, save, commit, push. The build catches schema errors before deploy — if the build fails, the site does NOT update.

```
src/content/
├── blogs/             — patient-education articles
├── cases/             — interesting clinical cases (anonymised)
├── stories/           — patient success stories (anonymised)
├── videos/            — video library entries (status: planned/in-production/live)
├── faqs/              — FAQ categories with Q&A arrays
├── services/          — procedure pages (gallbladder, hernia, etc.)
├── categories/        — service category pages (laparoscopic, HPB, etc.)
├── conditions/        — condition pages (gallstones, hernia, etc.)
├── doctors/           — doctor profile (only one entry — Dr. Reddy)
├── organization/      — practice-level info (name, email, sameAs)
└── locations/         — clinic locations (Apollo Nellore)
```

---

## 3. Keystatic in production: GitHub App setup

By default Keystatic runs in **local mode** — fine for `astro dev` on a laptop, useless on a deployed site (it can't write files on a serverless host).

For the deployed site, switch to **GitHub mode**: every save commits through the GitHub API, authenticated via a GitHub App. Setup is a one-time job, ~10 minutes.

### Step 1: Create a GitHub App

1. Go to **https://github.com/settings/apps/new** (or the equivalent under the org settings if the repo lives in an org).
2. Fill in:
   - **GitHub App name:** `Dr Reddy CMS` (or similar)
   - **Homepage URL:** `https://gastrosurgeonnellore.com`
   - **Callback URL:** `https://gastrosurgeonnellore.com/api/keystatic/github/oauth/callback`
   - **Setup URL (optional):** `https://gastrosurgeonnellore.com/keystatic/setup`
   - **Webhook:** Uncheck "Active"
3. Permissions:
   - **Repository → Contents:** Read and write
   - **Repository → Metadata:** Read
   - **Repository → Pull requests:** Read and write (enables review workflows)
4. **Where can this GitHub App be installed?** Only on this account.
5. Click **Create GitHub App**.
6. On the next page:
   - Note the **App ID** (a number).
   - Click **Generate a new client secret** and copy it (shown once).
   - Scroll to **Private keys** → **Generate a private key** (downloads a `.pem` file — not needed for OAuth flow but worth keeping safe).
7. **Install App** (left sidebar) → install on the `dr-dwarakanath-reddy-site` repository.

### Step 2: Set Vercel environment variables

In the Vercel project → Settings → Environment Variables, add for **Production** (and ideally **Preview**):

| Variable | Value |
| --- | --- |
| `KEYSTATIC_GITHUB_REPO_OWNER` | `AdopsMarketing` (or wherever the repo is) |
| `KEYSTATIC_GITHUB_REPO_NAME` | `dr-dwarakanath-reddy-site` |
| `KEYSTATIC_GITHUB_CLIENT_ID` | App's Client ID from the GitHub App page |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | The client secret you generated |
| `KEYSTATIC_SECRET` | Any random 32-character string (used to sign Keystatic's session cookie) |

Generate `KEYSTATIC_SECRET` with: `openssl rand -hex 32`.

Trigger a redeploy. The presence of `KEYSTATIC_GITHUB_REPO_OWNER` in the environment auto-switches the Keystatic config to GitHub mode — see `keystatic.config.ts` for the toggle logic.

### Step 3: Test login

Visit `https://gastrosurgeonnellore.com/keystatic`. You'll be redirected to GitHub for authorisation. Approve, and the admin UI loads. From now on, every Save in the admin opens a commit on the `main` branch (or a configurable branch).

### Step 4 (optional): Restrict who can edit

Anyone with read+write access to the repo can edit content. To grant access to the practice manager:

- Add them as a **collaborator** on the GitHub repo with **Write** access.
- They click "Sign in with GitHub" on `/keystatic`.

To remove access: remove them as a collaborator. Their next page load on `/keystatic` will fail authentication.

---

## 4. Day-to-day editing patterns

### Add a new blog post

1. Open `/keystatic` → **Blogs** → **+ Create**.
2. Fill in title, slug (auto-generated from title), excerpt, published date.
3. Write the body in the rich-text editor.
4. Click **Save**. The post is live at `/blogs/{slug}` once the build finishes (~1 minute).

### Add a new FAQ

1. **FAQs** → pick the existing category (e.g., `01-appointments`) → **+ Add item** under "Questions".
2. Type the question and answer.
3. **Save**. The FAQ appears on `/faqs` and gets added to the FAQPage JSON-LD automatically.

### Mark a video as live

1. **Videos** → pick the topic (e.g., "Do I really need gallbladder surgery?").
2. Set **Status** to **Live**, paste the **YouTube ID** (the 11-char string in the YouTube URL).
3. **Save**. The card on `/videos` switches from a placeholder to a clickable thumbnail with play overlay.

### Update phone number, email, or hospital info

1. **Organization** → edit fields.
2. **Save**. Changes propagate everywhere — header, footer, contact page, JSON-LD.

### Update Dr. Reddy's bio, publications, or experience

1. **Doctors** → "Dwarakanath Reddy Vembuluru".
2. Edit any section (Education, Experience, Publications, Awards).
3. **Save**. The About page (`/about-doctor`), homepage, and JSON-LD all update from this single source.

---

## 5. Local development

```bash
git clone https://github.com/AdopsMarketing/dr-dwarakanath-reddy-site.git
cd dr-dwarakanath-reddy-site
npm install
npm run dev
```

Open `http://localhost:4321` for the site, `http://localhost:4321/keystatic` for the admin (no auth required in local mode — saves go directly to the markdown files).

### Required environment variables for local dev (optional)

```bash
# .env  (gitignored)
RESEND_API_KEY=re_xxx        # only if you want the contact form to actually send email
CONTACT_EMAIL=dwarak858@gmail.com
```

Without `RESEND_API_KEY`, the contact form still accepts submissions but only logs them to the server console.

---

## 6. Deployment

`main` → Vercel auto-deploys to production within ~60 seconds.

Other branches → preview deploys at unique URLs (good for showing Dr. Reddy a draft before merging).

Required Vercel environment variables:

| Variable | Purpose | Required? |
| --- | --- | --- |
| `RESEND_API_KEY` | Contact form email delivery | Recommended |
| `CONTACT_EMAIL` | Where contact-form submissions are emailed (defaults to `dwarak858@gmail.com`) | Optional |
| `KEYSTATIC_GITHUB_*` | Keystatic GitHub mode (see section 3) | Recommended once handed over |

---

## 7. Going live checklist

- [ ] Replace `public/robots.txt` pre-launch block with the LIVE block (already in the file as a comment)
- [ ] Remove `<meta name="robots" content="noindex, nofollow" />` from `src/layouts/BaseLayout.astro` (lines 102-103)
- [ ] Verify `astro.config.mjs` `site:` is the final domain (currently `https://gastrosurgeonnellore.com`)
- [ ] Set `RESEND_API_KEY` in Vercel production env
- [ ] Set Keystatic GitHub mode env vars (see section 3)
- [ ] Submit `https://gastrosurgeonnellore.com/sitemap-index.xml` to Google Search Console
- [ ] Submit to Bing Webmaster Tools
- [ ] Verify Google Business Profile is linked from organization `sameAs`
- [ ] Smoke-test contact form
- [ ] Confirm `/keystatic` is reachable and login works

---

## 8. Architecture notes worth knowing

### URL structure
- Category landing: `/gi-services/{category-slug}` (e.g., `/gi-services/laparoscopic-surgery`)
- Procedure under category: `/gi-services/{category-slug}/{procedure-slug}` (e.g., `/gi-services/laparoscopic-surgery/gallbladder-surgery`)
- Old short-form URLs (e.g., `/gi-services/laparoscopic/gallbladder-surgery`) redirect via 301 — see `astro.config.mjs` `redirects:`.

### JSON-LD
Built dynamically per page in `src/lib/schema.ts` (Suresh Kumar Gondi `@id`-based entity graph methodology). Don't hand-edit JSON-LD in any page — the schema library is the source of truth.

### Voice / typography primitives
- `<Eyebrow>` — `§` prefix label above headings
- `font-display` class — the Newsreader serif used for display type
- `<em>` inside headings — italicised in the accent colour by global CSS
- Three fonts loaded: Newsreader (display), Inter Tight (body), JetBrains Mono (mono-caps labels)

### Image handling
Static images live in `public/`. Reference them by path (e.g., `/images/dr-dwarakanath-reddy.jpg`). Astro doesn't process them — keep them optimised before commit.

---

## 9. Common pitfalls

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Build fails after editing markdown | Schema mismatch (missing required field, wrong type) | Read the build error — it points to the file and field |
| `/keystatic` returns 404 in production | Static-build skipping SSR routes | Confirm `@keystatic/astro` integration is in `astro.config.mjs` — it auto-injects the SSR routes |
| Keystatic save fails with "401 Unauthorized" | GitHub OAuth env vars missing or wrong | Re-check the 5 `KEYSTATIC_*` env vars in Vercel |
| Contact form silently fails | `RESEND_API_KEY` missing | Set in Vercel env; redeploy |
| Old URL returns 404 instead of redirecting | Old child URL (e.g., `/gi-services/hpb/...`) | Already handled by 301s in `astro.config.mjs` — verify the request hits Vercel, not a stale CDN cache |

---

## 10. Who does what

| Task | Who | How |
| --- | --- | --- |
| Add blog post / FAQ / video | Practice team or agency | Keystatic at `/keystatic` |
| Add new procedure page | Agency | Edit `src/content/services/` directly (involves discriminated-union sections) |
| Layout / design changes | Agency | Code change in `src/pages/` or `src/components/` |
| URL restructures | Agency, with redirects | Update routes + add 301s in `astro.config.mjs` |
| Domain / DNS changes | Practice team | Vercel domain settings |
| GitHub access changes | Practice team | GitHub repo settings → Collaborators |

---

## 11. Files worth knowing

| File | Purpose |
| --- | --- |
| `astro.config.mjs` | Astro configuration, integrations, redirects |
| `keystatic.config.ts` | CMS schemas — mirrors `src/content.config.ts` |
| `src/content.config.ts` | Astro Content Collections schemas (build-time validation) |
| `src/layouts/BaseLayout.astro` | Page shell — `<head>` meta, JSON-LD, header/footer |
| `src/lib/schema.ts` | JSON-LD entity graph generator |
| `src/data/navigation.ts` | Header nav and mega-menu structure |
| `src/components/Header.astro`, `Footer.astro` | Site chrome |
| `src/styles/global.css` | Tailwind v4 `@theme` definitions, design tokens |
| `src/pages/api/contact.ts` | Contact form server endpoint (uses Resend) |
| `public/robots.txt` | Pre-launch crawler block (toggle when going live) |
