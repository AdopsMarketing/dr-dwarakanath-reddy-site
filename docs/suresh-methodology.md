# Suresh Kumar Gondi's Schema Methodology

This document is the canonical reference for schema.org / JSON-LD implementation on this site. Future sessions should read this first before touching `src/lib/schema.ts`, `src/layouts/BaseLayout.astro`, or any content collection schemas.

## Placement

- All JSON-LD lives inside `<script type="application/ld+json">` tags in **server-rendered HTML** (Astro's default SSG output).
- **Never** inject via GTM, client-side JavaScript, or after hydration.
- Verify the final schema is present in raw HTML with:

  ```bash
  curl http://localhost:4321 | grep ld+json
  ```

## Entity graph

- Every entity gets a **unique `@id`** using canonical URI + fragment. Examples:
  - `https://drreddy.com/#organization`
  - `https://drreddy.com/#physician-dwarakanath`
  - `https://drreddy.com/#condition-hernia`
  - `https://drreddy.com/#clinic-main`
- **Define each entity ONCE** with full properties, on its "home" page:
  - `MedicalOrganization` → homepage
  - `Physician` → doctor page
  - `MedicalClinic` → that clinic's location page
  - `MedicalProcedure` → that service's page
  - `MedicalCondition` → that condition's page
- Reference the same entity elsewhere via `{"@id": "..."}` only: never repeat properties.

## Required schema types

### Homepage: `MedicalOrganization`
- `name`, `legalName`, `alternateName[]`, `description`, `url`, `logo`
- `foundingDate`, `knowsLanguage`, `email`
- `areaServed[]`: each a `Place` with `sameAs` to Wikipedia + Wikidata + GeoNames
- `address`: `PostalAddress` with city `sameAs`
- `founder`: `Physician` with `@id` ref
- `employee[]`: `Physician` `@id` refs
- `location[]`: `MedicalClinic` `@id` refs
- `sameAs[]`: all social profiles + directory listings + Knowledge Graph ID
- `makesOffer[]`
- `contactPoint`: `ContactPoint`
- `potentialAction`: `ReserveAction` for booking

### Doctor page: `Physician`
- `@id`, `name`, `honorificPrefix`, `image`
- `alumniOf`: college with Wikipedia `sameAs`
- `hasCredential[]`: each qualification
- `medicalSpecialty`
- `knowsAbout[]`: each condition with Wikipedia `sameAs`
- `memberOf[]`: associations with `sameAs`
- `award[]`: with issuing body `sameAs` + PR URL
- `worksFor`: org `@id` ref
- `workLocation`: clinic `@id` refs
- `sameAs`: Practo + LinkedIn

### Condition page: `MedicalCondition`
- `@id`, `name`, `alternateName[]`, `description`
- `sameAs`: Wikipedia + Wikidata
- `code`: ICD-10
- `possibleTreatment[]`: links to treatment pages
- `signOrSymptom[]`, `riskFactor[]`
- `associatedAnatomy`, `relevantSpecialty`
- `availableService`: org `@id` ref

### Location page: `MedicalClinic`
- `@id`, `name`
- `address`: `PostalAddress` with city `sameAs`
- `geo`: `GeoCoordinates` lat/long
- `telephone`, `openingHours`
- `hasMap`: Google Maps URL
- `image`: `ImageObject`
- `aggregateRating`: once review data available
- `parentOrganization`: org `@id` ref
- `medicalSpecialty[]`
- `sameAs`: Google Business Profile + JustDial + Practo branch

### Every page: `BreadcrumbList`

### FAQ pages: `FAQPage`
- The only type that generates visual rich results.

## `sameAs` discipline

- Every `sameAs` must point to an **authoritative external source** Google trusts: Wikipedia, Wikidata, GeoNames, official directory listings, social profiles.
- **Never** `sameAs` to your own pages.
- Locations need Wikipedia + Wikidata + GeoNames (disambiguates cities).
- Conditions need Wikipedia + Wikidata.
- Doctors need Practo + LinkedIn + directory profiles.
- Org needs all social + directory + Knowledge Graph ID.

## Corroboration

- JSON-LD handles the full entity graph.
- Also add **inline Microdata** (`itemscope`, `itemtype`, `itemprop`) on key visible content (name, address, phone, doctor name, hours) for reinforcement.
- Schema claims must be backed by visible page content.

## Common mistakes to avoid

- Auto-generated schema from plugins: creates entity noise, can hurt rankings.
- Schema via GTM / client JS: not reliably indexed by LLMs or non-JS crawlers.
- Generic schema with no `sameAs`: entity can't be disambiguated.
- Duplicate entity declarations across pages: contradicts the entity graph.
- Schema claims not backed by visible page content.

## Implementation in this repo

- **`src/lib/schema.ts`**: reusable graph builder. Generates schema objects from typed Content Collection frontmatter. Never hand-roll JSON-LD outside this module.
- **`src/layouts/BaseLayout.astro`**: injects via `<script type="application/ld+json" set:html={JSON.stringify(schema)} />`. Chooses which entities to fully declare vs. reference based on `pageType`.
- **Content collections** (`src/content.config.ts`):
  - `organization`: singleton, homepage entity
  - `doctors`: physician entities (one per file)
  - `locations`: clinic entities (one per file)
  - `conditions`: MedicalCondition entities (one per file)
  - `services`: MedicalProcedure entities (one per file)
- **`@id` convention**: `${site.origin}/#{entity-key}`. Entity keys:
  - `organization`, `website`
  - `physician-{slug}` e.g. `physician-dwarakanath`
  - `clinic-{slug}` e.g. `clinic-main`
  - `procedure-{slug}` e.g. `procedure-gallbladder-surgery`
  - `condition-{slug}` e.g. `condition-hernia`
  - Page-specific: `{pageUrl}#webpage`, `{pageUrl}#breadcrumb`
