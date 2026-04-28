import { config, fields, collection, singleton } from '@keystatic/core';

/**
 * Keystatic admin config.
 *
 * - Default storage is 'local' so `astro dev` works without GitHub setup.
 * - In production set the env vars below to switch to GitHub mode (commits flow through GitHub OAuth).
 *   See HANDOVER.md → "Keystatic in production" for the GitHub App setup steps.
 *
 * The schemas below mirror src/content.config.ts so the Astro build stays the
 * source of truth — Keystatic just provides a friendlier editing UI on top.
 * If you change a Zod schema there, mirror the change here.
 */

const useGitHubStorage =
  !!process.env.KEYSTATIC_GITHUB_REPO_OWNER && !!process.env.KEYSTATIC_GITHUB_REPO_NAME;

// ---------------------------------------------------------------------------
// Reusable field fragments
// ---------------------------------------------------------------------------

const seoFields = fields.object({
  title: fields.text({ label: 'SEO title', description: 'Used as <title> and og:title. ~60 chars.' }),
  description: fields.text({ label: 'SEO description', multiline: true, description: '~150-160 chars.' }),
});

const sameAsField = fields.array(fields.url({ label: 'URL' }), {
  label: 'sameAs URLs',
  description: 'Wikipedia / Wikidata / authoritative external links. One per line.',
  itemLabel: (props) => props.value ?? 'URL',
});

const entityWithSameAs = fields.object({
  name: fields.text({ label: 'Name' }),
  sameAs: sameAsField,
});

// ---------------------------------------------------------------------------
// Service section discriminated union (prose | list | steps | timeline | faqs)
// ---------------------------------------------------------------------------

const serviceSections = fields.array(
  fields.conditional(
    fields.select({
      label: 'Section type',
      options: [
        { label: 'Prose (heading + paragraph)', value: 'prose' },
        { label: 'List (bullet points)', value: 'list' },
        { label: 'Steps (ordered)', value: 'steps' },
        { label: 'Timeline (period + detail)', value: 'timeline' },
        { label: 'FAQs (Q&A list)', value: 'faqs' },
      ],
      defaultValue: 'prose',
    }),
    {
      prose: fields.object({
        title: fields.text({ label: 'Title' }),
        body: fields.text({ label: 'Body', multiline: true }),
      }),
      list: fields.object({
        title: fields.text({ label: 'Title' }),
        intro: fields.text({ label: 'Intro', multiline: true }),
        items: fields.array(fields.text({ label: 'Item' }), { itemLabel: (p) => p.value }),
        outro: fields.text({ label: 'Outro', multiline: true }),
      }),
      steps: fields.object({
        title: fields.text({ label: 'Title' }),
        intro: fields.text({ label: 'Intro', multiline: true }),
        steps: fields.array(fields.text({ label: 'Step', multiline: true }), { itemLabel: (p) => p.value }),
        outro: fields.text({ label: 'Outro', multiline: true }),
      }),
      timeline: fields.object({
        title: fields.text({ label: 'Title' }),
        entries: fields.array(
          fields.object({
            period: fields.text({ label: 'Period' }),
            detail: fields.text({ label: 'Detail', multiline: true }),
          }),
          { itemLabel: (p) => p.fields.period.value }
        ),
        note: fields.text({ label: 'Note', multiline: true }),
      }),
      faqs: fields.object({
        title: fields.text({ label: 'Section title', defaultValue: 'Frequently asked questions' }),
        items: fields.array(
          fields.object({
            question: fields.text({ label: 'Question' }),
            answer: fields.text({ label: 'Answer', multiline: true }),
          }),
          { itemLabel: (p) => p.fields.question.value }
        ),
      }),
    }
  ),
  {
    label: 'Page sections',
    itemLabel: (p) => `${p.discriminant.toUpperCase()} · ${p.value.fields.title?.value ?? ''}`,
  }
);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export default config({
  storage: useGitHubStorage
    ? {
        kind: 'github',
        repo: {
          owner: process.env.KEYSTATIC_GITHUB_REPO_OWNER!,
          name: process.env.KEYSTATIC_GITHUB_REPO_NAME!,
        },
      }
    : { kind: 'local' },

  ui: {
    brand: { name: 'Dr. Reddy CMS' },
    navigation: {
      'Patient-facing': ['blogs', 'cases', 'stories', 'videos', 'faqs'],
      'Practice info': ['doctors', 'organization', 'locations'],
      'Procedures': ['services', 'categories', 'conditions'],
    },
  },

  singletons: {
    organization: singleton({
      label: 'Organization (practice info)',
      path: 'src/content/organization/main',
      format: { contentField: 'content' },
      schema: {
        name: fields.text({ label: 'Display name' }),
        legalName: fields.text({ label: 'Legal name' }),
        alternateName: fields.array(fields.text({ label: 'Alternate name' }), {
          label: 'Alternate names',
          itemLabel: (p) => p.value,
        }),
        description: fields.text({ label: 'Description', multiline: true }),
        foundingDate: fields.text({ label: 'Founding date (YYYY-MM)' }),
        knowsLanguage: fields.array(fields.text({ label: 'Language' }), {
          label: 'Languages spoken',
          itemLabel: (p) => p.value,
        }),
        email: fields.text({ label: 'Public email' }),
        telephone: fields.text({ label: 'Telephone' }),
        logo: fields.text({ label: 'Logo path' }),
        image: fields.text({ label: 'OG image path' }),
        contactPoint: fields.object({
          phone: fields.text({ label: 'Primary phone (with country code)' }),
          hospitalPhones: fields.array(fields.text({ label: 'Hospital phone' }), {
            label: 'Hospital phones',
            itemLabel: (p) => p.value,
          }),
          contactType: fields.text({ label: 'Contact type', defaultValue: 'appointments' }),
          availableLanguage: fields.array(fields.text({ label: 'Language' }), {
            label: 'Available languages',
            itemLabel: (p) => p.value,
          }),
          areaServed: fields.array(fields.text({ label: 'Area code' }), {
            label: 'Area served (country codes)',
            itemLabel: (p) => p.value,
          }),
        }),
        bookingUrl: fields.url({ label: 'Booking URL (e.g., WhatsApp)' }),
        sameAs: sameAsField,
        content: fields.markdoc({ label: 'Internal notes' }),
      },
    }),
  },

  collections: {
    // -------------------------------------------------------------------
    // Patient-facing content (most-edited)
    // -------------------------------------------------------------------

    blogs: collection({
      label: 'Blog posts',
      slugField: 'slug',
      path: 'src/content/blogs/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
        slug: fields.slug({ name: { label: 'URL slug' } }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        publishedAt: fields.text({ label: 'Published (YYYY-MM-DD)' }),
        updatedAt: fields.text({ label: 'Updated (YYYY-MM-DD)' }),
        author: fields.text({ label: 'Author', defaultValue: 'Dr. Dwarakanath Reddy V' }),
        reviewedBy: fields.text({ label: 'Reviewed by', defaultValue: 'Dr. Dwarakanath Reddy V' }),
        category: fields.text({ label: 'Category' }),
        relatedService: fields.text({ label: 'Related service URL' }),
        relatedServiceLabel: fields.text({ label: 'Related service label' }),
        tags: fields.array(fields.text({ label: 'Tag' }), { itemLabel: (p) => p.value, label: 'Tags' }),
        seo: seoFields,
        content: fields.markdoc({ label: 'Body' }),
      },
    }),

    cases: collection({
      label: 'Interesting cases',
      slugField: 'slug',
      path: 'src/content/cases/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
        slug: fields.slug({ name: { label: 'URL slug' } }),
        caseNumber: fields.text({ label: 'Case number' }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        publishedAt: fields.text({ label: 'Published (YYYY-MM-DD)' }),
        conditionName: fields.text({ label: 'Condition name' }),
        procedurePerformed: fields.text({ label: 'Procedure performed' }),
        outcomeAt: fields.text({ label: 'Outcome time (e.g., "12 months")' }),
        anonymized: fields.checkbox({ label: 'Anonymized', defaultValue: true }),
        relatedService: fields.text({ label: 'Related service URL' }),
        relatedServiceLabel: fields.text({ label: 'Related service label' }),
        seo: seoFields,
        content: fields.markdoc({ label: 'Case write-up' }),
      },
    }),

    stories: collection({
      label: 'Success stories',
      slugField: 'slug',
      path: 'src/content/stories/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
        slug: fields.slug({ name: { label: 'URL slug' } }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        publishedAt: fields.text({ label: 'Published (YYYY-MM-DD)' }),
        condition: fields.text({ label: 'Condition' }),
        procedure: fields.text({ label: 'Procedure' }),
        outcomeTime: fields.text({ label: 'Outcome time' }),
        anonymized: fields.checkbox({ label: 'Anonymized', defaultValue: true }),
        relatedService: fields.text({ label: 'Related service URL' }),
        relatedServiceLabel: fields.text({ label: 'Related service label' }),
        seo: seoFields,
        content: fields.markdoc({ label: 'Story body' }),
      },
    }),

    videos: collection({
      label: 'Videos',
      slugField: 'slug',
      path: 'src/content/videos/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
        slug: fields.slug({ name: { label: 'URL slug' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Patient education', value: 'patient-education' },
            { label: 'Procedure explainer', value: 'procedure-explainer' },
            { label: 'Recovery guide', value: 'recovery-guide' },
            { label: 'Second opinion', value: 'second-opinion' },
            { label: 'Practice', value: 'practice' },
          ],
          defaultValue: 'patient-education',
        }),
        youtubeId: fields.text({ label: 'YouTube ID', description: 'The 11-char ID in the YouTube URL. Leave empty for planned/in-production videos.' }),
        duration: fields.text({ label: 'Duration (e.g., "6:30")' }),
        publishedAt: fields.text({ label: 'Published (YYYY-MM-DD)' }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Planned', value: 'planned' },
            { label: 'In production (filming)', value: 'in-production' },
            { label: 'Live (published)', value: 'live' },
          ],
          defaultValue: 'planned',
        }),
        relatedService: fields.text({ label: 'Related service URL' }),
        relatedServiceLabel: fields.text({ label: 'Related service label' }),
        thumbnail: fields.text({ label: 'Thumbnail override path (optional)' }),
        order: fields.number({ label: 'Display order', defaultValue: 100 }),
        seo: seoFields,
        content: fields.markdoc({ label: 'Internal notes' }),
      },
    }),

    faqs: collection({
      label: 'FAQ categories',
      slugField: 'slug',
      path: 'src/content/faqs/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Category title' }),
        eyebrow: fields.text({ label: 'Eyebrow text' }),
        slug: fields.slug({ name: { label: 'URL slug' } }),
        intro: fields.text({ label: 'Intro paragraph', multiline: true }),
        order: fields.number({ label: 'Display order', defaultValue: 100 }),
        items: fields.array(
          fields.object({
            question: fields.text({ label: 'Question' }),
            answer: fields.text({ label: 'Answer', multiline: true }),
            featured: fields.checkbox({ label: 'Featured (homepage)', defaultValue: false }),
          }),
          { label: 'Questions', itemLabel: (p) => p.fields.question.value }
        ),
        seo: seoFields,
        content: fields.markdoc({ label: 'Internal notes' }),
      },
    }),

    // -------------------------------------------------------------------
    // Practice / structural content (rarely edited)
    // -------------------------------------------------------------------

    doctors: collection({
      label: 'Doctors',
      slugField: 'entityKey',
      path: 'src/content/doctors/*',
      format: { contentField: 'content' },
      schema: {
        entityKey: fields.slug({ name: { label: 'Entity key' } }),
        isPrimary: fields.checkbox({ label: 'Primary doctor', defaultValue: false }),
        name: fields.text({ label: 'Full name (no title)' }),
        title: fields.text({ label: 'Position / title' }),
        honorificPrefix: fields.text({ label: 'Honorific prefix', defaultValue: 'Dr.' }),
        image: fields.text({ label: 'Image path' }),
        yearsExperience: fields.number({ label: 'Years of experience' }),
        surgeriesPerformed: fields.number({ label: 'Surgeries performed' }),
        credentials: fields.array(fields.text({ label: 'Credential' }), {
          label: 'Credentials (short form)',
          itemLabel: (p) => p.value,
        }),
        education: fields.array(
          fields.object({
            degree: fields.text({ label: 'Degree' }),
            college: fields.text({ label: 'College' }),
            years: fields.text({ label: 'Years (e.g., 2017–2020)' }),
          }),
          { label: 'Education', itemLabel: (p) => p.fields.degree.value }
        ),
        experience: fields.array(
          fields.object({
            period: fields.text({ label: 'Period' }),
            role: fields.text({ label: 'Role' }),
            place: fields.text({ label: 'Place' }),
            detail: fields.text({ label: 'Detail', multiline: true }),
          }),
          { label: 'Experience', itemLabel: (p) => p.fields.role.value }
        ),
        publications: fields.array(
          fields.object({
            title: fields.text({ label: 'Title' }),
            journal: fields.text({ label: 'Journal' }),
            year: fields.number({ label: 'Year' }),
            role: fields.text({ label: 'Role (e.g., Corresponding Author)' }),
          }),
          { label: 'Publications', itemLabel: (p) => p.fields.title.value }
        ),
        award: fields.array(
          fields.object({
            name: fields.text({ label: 'Award name' }),
            date: fields.text({ label: 'Date / year' }),
            recognizedBy: fields.object({
              name: fields.text({ label: 'Conference / org' }),
            }),
          }),
          { label: 'Awards & presentations', itemLabel: (p) => p.fields.name.value }
        ),
        medicalSpecialty: fields.array(fields.text({ label: 'Specialty' }), {
          label: 'Medical specialties',
          itemLabel: (p) => p.value,
        }),
        languages: fields.array(fields.text({ label: 'Language' }), {
          label: 'Languages',
          itemLabel: (p) => p.value,
        }),
        googleRating: fields.object({
          value: fields.number({ label: 'Rating value' }),
          reviewCount: fields.number({ label: 'Review count' }),
        }),
        registrationNumber: fields.text({ label: 'Medical registration number' }),
        sameAs: sameAsField,
        seo: seoFields,
        content: fields.markdoc({ label: 'Long bio' }),
      },
    }),

    locations: collection({
      label: 'Locations',
      slugField: 'entityKey',
      path: 'src/content/locations/*',
      format: { contentField: 'content' },
      schema: {
        name: fields.text({ label: 'Name' }),
        entityKey: fields.slug({ name: { label: 'Entity key' } }),
        isPrimary: fields.checkbox({ label: 'Primary location', defaultValue: false }),
        address: fields.object({
          streetAddress: fields.text({ label: 'Street address' }),
          addressLocality: fields.text({ label: 'City' }),
          addressRegion: fields.text({ label: 'State' }),
          postalCode: fields.text({ label: 'Postal code' }),
          addressCountry: fields.text({ label: 'Country code', defaultValue: 'IN' }),
        }),
        telephone: fields.array(fields.text({ label: 'Phone' }), {
          label: 'Phone numbers',
          itemLabel: (p) => p.value,
        }),
        whatsapp: fields.text({ label: 'WhatsApp number' }),
        email: fields.text({ label: 'Email' }),
        openingHours: fields.text({ label: 'Opening hours (text)' }),
        hasMap: fields.url({ label: 'Google Maps URL' }),
        mapEmbedUrl: fields.url({ label: 'Maps embed URL' }),
        sameAs: sameAsField,
        content: fields.markdoc({ label: 'Notes' }),
      },
    }),

    services: collection({
      label: 'Services / procedures',
      slugField: 'slug',
      path: 'src/content/services/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
        slug: fields.slug({ name: { label: 'URL slug' } }),
        h1: fields.text({ label: 'H1 heading' }),
        h1Secondary: fields.text({ label: 'H1 secondary line' }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Surgical Care', value: 'surgical-care' },
            { label: 'Advanced Surgery', value: 'advanced-surgery' },
            { label: 'Procedures', value: 'procedures' },
            { label: 'Laparoscopic', value: 'laparoscopic' },
            { label: 'HPB', value: 'hpb' },
            { label: 'Oncology', value: 'oncology' },
            { label: 'Bariatric', value: 'bariatric' },
          ],
          defaultValue: 'procedures',
        }),
        shortDescription: fields.text({ label: 'Short description', multiline: true }),
        overview: fields.text({ label: 'Overview', multiline: true }),
        procedureType: fields.text({ label: 'Procedure type' }),
        typicalDuration: fields.text({ label: 'Typical duration' }),
        hospitalStay: fields.text({ label: 'Hospital stay' }),
        recoveryTime: fields.text({ label: 'Recovery time' }),
        anesthesia: fields.text({ label: 'Anesthesia' }),
        approach: fields.select({
          label: 'Approach',
          options: [
            { label: '—', value: 'minimally-invasive' },
            { label: 'Laparoscopic', value: 'laparoscopic' },
            { label: 'Open', value: 'open' },
            { label: 'Robotic', value: 'robotic' },
            { label: 'Endoscopic', value: 'endoscopic' },
            { label: 'Mixed', value: 'mixed' },
          ],
          defaultValue: 'laparoscopic',
        }),
        bodyLocation: fields.text({ label: 'Body location' }),
        indications: fields.array(fields.text({ label: 'Indication' }), {
          label: 'Indications',
          itemLabel: (p) => p.value,
        }),
        heroIntro: fields.text({ label: 'Hero intro', multiline: true }),
        sections: serviceSections,
        phase: fields.select({
          label: 'Phase',
          options: [
            { label: 'Phase 1 (live)', value: '1' },
            { label: 'Phase 2 (planned)', value: '2' },
          ],
          defaultValue: '1',
        }),
        order: fields.number({ label: 'Display order', defaultValue: 100 }),
        sameAs: sameAsField,
        seo: seoFields,
        content: fields.markdoc({ label: 'Long-form content' }),
      },
    }),

    categories: collection({
      label: 'Service categories',
      slugField: 'slug',
      path: 'src/content/categories/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
        slug: fields.slug({ name: { label: 'URL slug' } }),
        h1: fields.text({ label: 'H1' }),
        h1Secondary: fields.text({ label: 'H1 secondary line' }),
        shortDescription: fields.text({ label: 'Short description', multiline: true }),
        heroIntro: fields.text({ label: 'Hero intro', multiline: true }),
        whatWeCover: fields.object({
          title: fields.text({ label: 'Section title', defaultValue: 'What we offer' }),
          items: fields.array(
            fields.object({
              title: fields.text({ label: 'Item title' }),
              href: fields.text({ label: 'Link (optional)' }),
              description: fields.text({ label: 'Description', multiline: true }),
            }),
            { label: 'Items', itemLabel: (p) => p.fields.title.value }
          ),
        }),
        sections: serviceSections,
        order: fields.number({ label: 'Display order', defaultValue: 100 }),
        seo: seoFields,
        content: fields.markdoc({ label: 'Long-form content' }),
      },
    }),

    conditions: collection({
      label: 'Conditions',
      slugField: 'slug',
      path: 'src/content/conditions/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
        slug: fields.slug({ name: { label: 'URL slug' } }),
        shortDescription: fields.text({ label: 'Short description', multiline: true }),
        alternateName: fields.array(fields.text({ label: 'Alternate name' }), {
          label: 'Alternate names',
          itemLabel: (p) => p.value,
        }),
        icd10Code: fields.text({ label: 'ICD-10 code' }),
        signOrSymptom: fields.array(fields.text({ label: 'Sign/symptom' }), {
          label: 'Signs / symptoms',
          itemLabel: (p) => p.value,
        }),
        riskFactor: fields.array(fields.text({ label: 'Risk factor' }), {
          label: 'Risk factors',
          itemLabel: (p) => p.value,
        }),
        relevantSpecialty: fields.text({ label: 'Relevant specialty' }),
        sameAs: sameAsField,
        seo: seoFields,
        content: fields.markdoc({ label: 'Long-form content' }),
      },
    }),
  },
});
