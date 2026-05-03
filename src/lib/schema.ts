/**
 * Schema graph builder. Single source of truth for all JSON-LD on the site.
 * Follows the Suresh Kumar Gondi methodology. See docs/suresh-methodology.md.
 *
 * Rules:
 *  - Every entity has a unique @id (canonical origin + fragment).
 *  - Each entity is fully declared ONCE, on its "home" page.
 *    Elsewhere it appears only as {"@id": "..."} reference.
 *  - Every page carries WebSite + WebPage + BreadcrumbList.
 */

import type { CollectionEntry } from 'astro:content';

type Organization = CollectionEntry<'organization'>;
type Doctor = CollectionEntry<'doctors'>;
type Location = CollectionEntry<'locations'>;
type Service = CollectionEntry<'services'>;
type Category = CollectionEntry<'categories'>;
type Condition = CollectionEntry<'conditions'>;
type Blog = CollectionEntry<'blogs'>;
type Case = CollectionEntry<'cases'>;
type Story = CollectionEntry<'stories'>;

export type ArticleInput =
  | { kind: 'blog'; entry: Blog }
  | { kind: 'case'; entry: Case }
  | { kind: 'story'; entry: Story };

// -----------------------------------------------------------------------------
// @id helpers
// -----------------------------------------------------------------------------

export const ids = {
  organization: (origin: string) => `${origin}/#organization`,
  apolloHospitals: (origin: string) => `${origin}/#apollo-hospitals`,
  website: (origin: string) => `${origin}/#website`,
  physician: (origin: string, slug: string) => `${origin}/#physician-${slug}`,
  clinic: (origin: string, slug: string) => `${origin}/#clinic-${slug}`,
  procedure: (origin: string, slug: string) => `${origin}/#procedure-${slug}`,
  category: (origin: string, slug: string) => `${origin}/#category-${slug}`,
  condition: (origin: string, slug: string) => `${origin}/#condition-${slug}`,
  publication: (origin: string, slug: string) => `${origin}/#publication-${slug}`,
  webPage: (pageUrl: string) => `${pageUrl}#webpage`,
  breadcrumb: (pageUrl: string) => `${pageUrl}#breadcrumb`,
  article: (pageUrl: string) => `${pageUrl}#article`,
};

const SITE_LANG = 'en-IN';

export function ref(id: string) {
  return { '@id': id };
}

// -----------------------------------------------------------------------------
// Entity builders. Each returns a full node (used on that entity's home page).
// -----------------------------------------------------------------------------

export function organizationNode(opts: {
  origin: string;
  org: Organization;
  founderId: string;
  clinicIds: string[];
  offerIds: Array<{ id: string; name: string; description: string }>;
  primaryCityName: string;
}) {
  const { origin, org, founderId, clinicIds, offerIds, primaryCityName } = opts;
  const d = org.data;

  const makesOffer = offerIds.map((o) => ({
    '@type': 'Offer',
    name: o.name,
    description: o.description,
    itemOffered: ref(o.id),
  }));

  const contactPoint = d.contactPoint
    ? [
        {
          '@type': 'ContactPoint',
          telephone: d.contactPoint.phone,
          contactType: d.contactPoint.contactType,
          availableLanguage: d.contactPoint.availableLanguage,
          areaServed: d.contactPoint.areaServed,
        },
        ...d.contactPoint.hospitalPhones.map((num) => ({
          '@type': 'ContactPoint',
          telephone: num,
          contactType: 'hospital reception',
          availableLanguage: d.contactPoint!.availableLanguage,
          areaServed: d.contactPoint!.areaServed,
        })),
      ]
    : undefined;

  const potentialAction = d.bookingUrl
    ? {
        '@type': 'ReserveAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: d.bookingUrl,
          actionPlatform: [
            'http://schema.org/DesktopWebPlatform',
            'http://schema.org/MobileWebPlatform',
          ],
        },
        result: {
          '@type': 'Reservation',
          name: 'Appointment',
        },
      }
    : undefined;

  return {
    '@type': 'MedicalOrganization',
    '@id': ids.organization(origin),
    name: d.name,
    legalName: d.legalName,
    alternateName: d.alternateName,
    description: d.description,
    url: origin,
    logo: d.logo
      ? {
          '@type': 'ImageObject',
          url: absolute(origin, d.logo),
        }
      : undefined,
    image: d.image
      ? {
          '@type': 'ImageObject',
          url: absolute(origin, d.image),
        }
      : undefined,
    foundingDate: d.foundingDate,
    knowsLanguage: d.knowsLanguage,
    email: d.email,
    telephone: d.telephone ?? d.contactPoint?.phone,
    medicalSpecialty: ['https://schema.org/Gastroenterologic'],
    areaServed: d.areaServed.map((place) => ({
      '@type': place.type,
      name: place.name,
      sameAs: place.sameAs,
    })),
    // addressLocality is a plain string (per schema.org spec); the City entity
    // with its sameAs lives in `areaServed` above.
    address: {
      '@type': 'PostalAddress',
      addressLocality: primaryCityName,
      addressCountry: 'IN',
    },
    founder: ref(founderId),
    // `employee` removed: schema.org defines its target type as Person, but
    // schema.org/Physician is a subtype of MedicalOrganization (not Person), so
    // strict validators reject Physician @id refs in employee. The bidirectional
    // link is still encoded via Org.founder + Physician.worksFor.
    location: clinicIds.map(ref),
    sameAs: [...d.sameAs, d.knowledgeGraphId].filter(Boolean),
    makesOffer,
    contactPoint,
    potentialAction,
    // `paymentAccepted` and `currenciesAccepted` are LocalBusiness/Service
    // properties, not Organization properties. They live on MedicalClinic
    // (which extends LocalBusiness) instead — see medicalClinicNode below.
  };
}

// -----------------------------------------------------------------------------
// Stub builders — minimal typed nodes for entities declared in full elsewhere.
// Emitted on every page so each page's @graph resolves standalone (LLMs and
// non-Google crawlers don't reliably follow cross-document @id references).
// -----------------------------------------------------------------------------

export function organizationStubNode(origin: string, org: Organization) {
  const d = org.data;
  return {
    '@type': 'MedicalOrganization',
    '@id': ids.organization(origin),
    name: d.name,
    url: origin,
    logo: d.logo
      ? { '@type': 'ImageObject', url: absolute(origin, d.logo) }
      : undefined,
    sameAs: d.sameAs,
  };
}

export function physicianStubNode(origin: string, doctor: Doctor) {
  const d = doctor.data;
  return {
    // Dual-type — see comment on physicianNode for why both types are needed.
    '@type': ['Physician', 'Person'],
    '@id': ids.physician(origin, d.entityKey),
    name: d.name,
    honorificPrefix: d.honorificPrefix,
    jobTitle: d.title,
    image: d.image
      ? { '@type': 'ImageObject', url: absolute(origin, d.image) }
      : undefined,
    url: `${origin}/about-doctor/`,
    sameAs: d.sameAs,
  };
}

export function medicalClinicStubNode(origin: string, location: Location) {
  const d = location.data;
  return {
    '@type': 'MedicalClinic',
    '@id': ids.clinic(origin, d.entityKey),
    name: d.name,
    url: `${origin}/contact/`,
    image: d.image ? { '@type': 'ImageObject', url: absolute(origin, d.image) } : undefined,
    sameAs: d.sameAs,
    parentOrganization: ref(ids.apolloHospitals(origin)),
  };
}

// Doctor publications → ScholarlyArticle nodes. Strongest E-E-A-T signal a
// physician has — connects the doctor to the academic record. Each publication
// gets its own @id (slugified from the title) so the Physician can reference it
// via `subjectOf`. Emitted on the doctor's home page only.
//
// schema.org/ScholarlyArticle is the right type for peer-reviewed work; for
// case reports and presentations we still use ScholarlyArticle (the type
// accepts both).
function publicationSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function publicationNode(opts: {
  origin: string;
  publication: { title: string; journal?: string; year?: number; role?: string; url?: string };
  authorId: string;
}) {
  const { origin, publication: p, authorId } = opts;
  const slug = publicationSlug(p.title);
  return {
    '@type': 'ScholarlyArticle',
    '@id': ids.publication(origin, slug),
    headline: p.title,
    name: p.title,
    author: ref(authorId),
    creator: ref(authorId),
    isPartOf: p.journal
      ? { '@type': 'Periodical', name: p.journal }
      : undefined,
    datePublished: p.year ? String(p.year) : undefined,
    url: p.url,
  };
}

// Apollo Hospitals — the corporate parent of Apollo Speciality Hospitals Nellore.
// Dr. Reddy is a consultant at the Nellore facility; consultations route to Apollo.
// Declared as a stub on every page so the clinic's parentOrganization and the
// physician's affiliation resolve in-graph instead of dangling as bare @id refs.
export function apolloHospitalsNode(origin: string) {
  return {
    '@type': 'MedicalOrganization',
    '@id': ids.apolloHospitals(origin),
    name: 'Apollo Hospitals',
    legalName: 'Apollo Hospitals Enterprise Limited',
    alternateName: ['AHEL', 'Apollo Hospitals Group'],
    url: 'https://www.apollohospitals.com/',
    foundingDate: '1983',
    sameAs: [
      'https://en.wikipedia.org/wiki/Apollo_Hospitals',
      'https://www.wikidata.org/wiki/Q4780321',
      'https://www.linkedin.com/company/apollo-hospitals/',
    ],
  };
}

export function physicianNode(opts: {
  origin: string;
  doctor: Doctor;
  orgId: string;
  clinicIds: string[];
  procedureIds?: string[];
  publicationIds?: string[];
  conditionIdMap?: Record<string, string>; // wikipedia URL → condition @id
  profileUrl?: string;                     // canonical /about-doctor URL
}) {
  const { origin, doctor, orgId, clinicIds, procedureIds = [], publicationIds = [], conditionIdMap = {}, profileUrl } = opts;
  const d = doctor.data;

  // Build identifier list from registrations (preferred) or legacy registrationNumber.
  // schema.org/PropertyValue does not define validFrom/validUntil — drop them.
  // The validity dates remain visible in HTML on /about-doctor.
  const registrationIdentifiers = (d.registrations ?? []).map((r) => ({
    '@type': 'PropertyValue',
    name: `${r.council} Registration`,
    propertyID: r.councilSameAs[0] ?? `medical-council-${slugify(r.council)}`,
    value: r.number,
  }));
  const legacyIdentifier = d.registrationNumber && registrationIdentifiers.length === 0
    ? [{
        '@type': 'PropertyValue',
        propertyID: 'medical-council-registration',
        value: d.registrationNumber,
      }]
    : [];
  const identifier = [...registrationIdentifiers, ...legacyIdentifier];

  const aggregateRating = d.googleRating
    ? {
        '@type': 'AggregateRating',
        ratingValue: d.googleRating.value,
        reviewCount: d.googleRating.reviewCount,
        bestRating: 5,
        worstRating: 1,
      }
    : undefined;

  // Prefer @id reference when a built MedicalCondition page exists for the topic,
  // otherwise fall back to inline MedicalCondition with sameAs anchoring.
  const knowsAbout = d.knowsAbout.map((k) => {
    const wikipediaMatch = k.sameAs.find((u) => /wikipedia\.org/.test(u));
    const refId = wikipediaMatch ? conditionIdMap[wikipediaMatch] : undefined;
    if (refId) return ref(refId);
    return {
      '@type': 'MedicalCondition',
      name: k.name,
      sameAs: k.sameAs,
    };
  });

  return {
    // Dual-type: schema.org/Physician is a subtype of MedicalOrganization (NOT
    // Person). Properties like honorificPrefix, jobTitle, alumniOf, worksFor,
    // affiliation, nationality, award are defined on Person and not inherited
    // by Physician. Declaring both types makes the Person properties valid in
    // strict validators while preserving the medical-org semantics.
    '@type': ['Physician', 'Person'],
    '@id': ids.physician(origin, d.entityKey),
    name: d.name,
    honorificPrefix: d.honorificPrefix,
    jobTitle: d.title,
    description: d.seo?.description,
    image: d.image
      ? {
          '@type': 'ImageObject',
          url: absolute(origin, d.image),
          caption: `${d.honorificPrefix} ${d.name}, ${d.title ?? ''}`.trim(),
        }
      : undefined,
    medicalSpecialty: specialtyEnumArray(d.medicalSpecialty),
    knowsLanguage: d.languages,
    alumniOf: d.alumniOf.map((a) => ({
      '@type': 'EducationalOrganization',
      name: a.name,
      sameAs: a.sameAs,
    })),
    hasCredential: d.hasCredential.map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: c.name,
      description: c.description,
      credentialCategory: c.credentialCategory,
      recognizedBy: c.recognizedBy
        ? {
            '@type': 'EducationalOrganization',
            name: c.recognizedBy.name,
            sameAs: c.recognizedBy.sameAs,
          }
        : undefined,
    })),
    knowsAbout,
    memberOf: d.memberOf.map((m) => ({
      '@type': 'Organization',
      name: m.name,
      sameAs: m.sameAs,
    })),
    // schema.org/award accepts Text only; structured Award objects are invalid.
    // Award details (date, awarder) remain visible in HTML on /about-doctor.
    award: d.award.map((a) => a.recognizedBy?.name
      ? `${a.name} (${a.recognizedBy.name}, ${a.date})`
      : `${a.name} (${a.date})`
    ),
    identifier: identifier.length > 0 ? identifier : undefined,
    nationality: d.nationality
      ? {
          '@type': 'Country',
          name: d.nationality.name,
          sameAs: d.nationality.sameAs,
        }
      : undefined,
    url: profileUrl,
    worksFor: ref(orgId),
    // Apollo is the host hospital for Dr. Reddy's consultations; the practice
    // entity (#organization) is his professional brand. Both are real affiliations.
    affiliation: [ref(orgId), ref(ids.apolloHospitals(origin))],
    workLocation: clinicIds.map(ref),
    // Bidirectional Physician → Procedure link (procedures already link back via `performer`).
    availableService: procedureIds.length > 0 ? procedureIds.map(ref) : undefined,
    // Physician → ScholarlyArticle: peer-reviewed work the doctor authored (E-E-A-T signal).
    subjectOf: publicationIds.length > 0 ? publicationIds.map(ref) : undefined,
    aggregateRating,
    sameAs: d.sameAs,
  };
}

export function medicalClinicNode(opts: {
  origin: string;
  location: Location;
  orgId: string;
}) {
  const { origin, location } = opts;
  const d = location.data;

  return {
    '@type': 'MedicalClinic',
    '@id': ids.clinic(origin, d.entityKey),
    name: d.name,
    image: d.image ? { '@type': 'ImageObject', url: absolute(origin, d.image) } : undefined,
    address: buildPostalAddress(d.address),
    geo: d.geo
      ? {
          '@type': 'GeoCoordinates',
          latitude: d.geo.latitude,
          longitude: d.geo.longitude,
        }
      : undefined,
    telephone: d.telephone,
    email: d.email,
    hasMap: d.hasMap,
    openingHours: d.openingHours,
    openingHoursSpecification:
      d.hours.length > 0
        ? d.hours.map((h) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: h.days,
            opens: h.opens,
            closes: h.closes,
          }))
        : undefined,
    medicalSpecialty: specialtyEnumArray(d.medicalSpecialty),
    // Apollo Speciality Hospitals Nellore is owned and operated by Apollo Hospitals
    // Enterprise Limited; Dr. Reddy is a consultant at this facility, not its parent.
    parentOrganization: ref(ids.apolloHospitals(origin)),
    memberOf: ref(ids.apolloHospitals(origin)),
    sameAs: d.sameAs,
    isAcceptingNewPatients: d.isAcceptingNewPatients,
    paymentAccepted: d.paymentAccepted.length > 0 ? d.paymentAccepted : undefined,
    currenciesAccepted: d.currenciesAccepted,
    hasCertification:
      d.hasCertification.length > 0
        ? d.hasCertification.map((c) => ({
            '@type': 'Certification',
            name: c.name,
            identifier: c.identifier,
            recognizedBy: c.recognizedBy
              ? {
                  '@type': 'Organization',
                  name: c.recognizedBy.name,
                  sameAs: c.recognizedBy.sameAs,
                }
              : undefined,
          }))
        : undefined,
  };
}

export function medicalProcedureNode(opts: {
  origin: string;
  service: Service;
  physicianId: string;
  orgId: string;
}) {
  const { origin, service, physicianId, orgId } = opts;
  const d = service.data;

  // The procedure→condition link is encoded via internal HTML links and the
  // conditions graph, not via `indication`: schema.org's official validator
  // rejects `indication` on MedicalProcedure (INVALID_PREDICATE), even though
  // it is documented at the MedicalEntity level.

  return {
    '@type': 'MedicalProcedure',
    '@id': ids.procedure(origin, d.slug),
    name: d.h1 ?? d.title,
    alternateName: d.procedureType,
    description: d.shortDescription,
    bodyLocation: d.bodyLocation,
    howPerformed: d.approach,
    followup: d.recoveryTime,
    // schema.org constrains relevantSpecialty to its MedicalSpecialty enumeration;
    // free-form strings (e.g., "Surgical Gastroenterology") are rejected by validators.
    relevantSpecialty: 'https://schema.org/Gastroenterologic',
    // Disambiguates from Ayurvedic / Homeopathic / other systems (relevant in Indian context).
    medicineSystem: 'https://schema.org/WesternConventional',
    // The body that recognises this procedure as evidence-based medical practice.
    recognizingAuthority: {
      '@type': 'MedicalOrganization',
      name: 'National Medical Commission, India',
      sameAs: [
        'https://www.nmc.org.in/',
        'https://en.wikipedia.org/wiki/National_Medical_Commission',
        'https://www.wikidata.org/wiki/Q19938908',
      ],
    },
    // Physician → procedure relationship is encoded on the Physician side
    // (knowsAbout / medicalSpecialty); schema.org does not put `performer` on
    // MedicalProcedure. Same with `availableService` (that lives on Place).
    sameAs: d.sameAs,
  };
}

// Category pages (Surgical Gastroenterology, HPB Surgery, GI Oncology, etc.)
// describe a class of related surgical procedures. Emit them as a parent
// MedicalProcedure entity so each topical hub page has a real entity Google
// can resolve, instead of being a bare WebPage with no subject anchor.
//
// Note: schema.org has no clean parent→child link between MedicalProcedures.
// The category→sub-procedure relationship is encoded via internal HTML links
// (Reasonable Surfer signal) and breadcrumb hierarchy, not via `hasPart` —
// which is a CreativeWork property and triggers validator warnings on
// MedicalProcedure.
export function categoryNode(opts: {
  origin: string;
  category: Category;
}) {
  const { origin, category } = opts;
  const d = category.data;

  return {
    '@type': 'MedicalProcedure',
    '@id': ids.category(origin, d.slug),
    name: d.h1 ?? d.title,
    description: d.shortDescription,
    relevantSpecialty: 'https://schema.org/Gastroenterologic',
    medicineSystem: 'https://schema.org/WesternConventional',
    recognizingAuthority: {
      '@type': 'MedicalOrganization',
      name: 'National Medical Commission, India',
      sameAs: [
        'https://www.nmc.org.in/',
        'https://en.wikipedia.org/wiki/National_Medical_Commission',
        'https://www.wikidata.org/wiki/Q19938908',
      ],
    },
    sameAs: d.sameAs,
  };
}

export function articleNode(opts: {
  origin: string;
  pageUrl: string;
  article: ArticleInput;
  authorId: string;
  publisherId: string;
  aboutConditionIds?: string[];
  mentionsProcedureIds?: string[];
  wordCount?: number;
}) {
  const {
    origin, pageUrl, article, authorId, publisherId,
    aboutConditionIds = [], mentionsProcedureIds = [], wordCount,
  } = opts;
  const data = article.entry.data;

  // Cases and stories are clinical content → MedicalWebPage. Blogs are general
  // patient-education articles → Article. (Both are valid Article-derived types.)
  const type = article.kind === 'blog' ? 'Article' : 'MedicalWebPage';
  const datePublished = data.publishedAt;
  const dateModified = ('updatedAt' in data ? data.updatedAt : undefined) ?? data.publishedAt;
  // Cases use the most recent publication; treat publishedAt as last review unless updated.
  const lastReviewed = dateModified;

  const headline = data.title;
  const description = data.excerpt;

  // articleSection: blog category, or kind label for cases/stories.
  const articleSection =
    article.kind === 'blog'
      ? ('category' in data ? data.category : undefined)
      : article.kind === 'case'
        ? 'Clinical case'
        : 'Patient story';

  // keywords: from blog `tags`, fallback to the related condition/procedure name.
  const keywords =
    'tags' in data && Array.isArray((data as { tags?: string[] }).tags)
      ? (data as { tags: string[] }).tags
      : undefined;

  const about = aboutConditionIds.map(ref);
  const mentions = mentionsProcedureIds.map(ref);

  // MedicalWebPage subtypes get an audience tag.
  const audience = type === 'MedicalWebPage'
    ? { '@type': 'MedicalAudience', audienceType: 'Patient' }
    : undefined;

  // MedicalWebPage subtypes get an `aspect` describing what facet of the topic.
  const aspect = type === 'MedicalWebPage'
    ? (article.kind === 'case' ? 'Treatment' : 'Self Care')
    : undefined;

  return stripUndefined({
    '@type': type,
    '@id': ids.article(pageUrl),
    headline,
    description,
    url: pageUrl,
    inLanguage: SITE_LANG,
    datePublished,
    dateModified,
    author: ref(authorId),
    publisher: ref(publisherId),
    reviewedBy: ref(authorId),
    lastReviewed,
    mainEntityOfPage: { '@id': ids.webPage(pageUrl) },
    about: about.length > 0 ? about : undefined,
    mentions: mentions.length > 0 ? mentions : undefined,
    articleSection,
    keywords,
    wordCount,
    audience,
    aspect,
    image: {
      '@type': 'ImageObject',
      url: `${origin}/og-image.jpg`,
    },
  });
}

export function faqPageFromService(opts: { pageUrl: string; service: Service }) {
  const faqSection = opts.service.data.sections.find(
    (s): s is Extract<typeof s, { type: 'faqs' }> => s.type === 'faqs'
  );
  if (!faqSection) return undefined;
  return faqPageNode({
    pageUrl: opts.pageUrl,
    questions: faqSection.items,
  });
}

// Map free-form specialty strings (used in frontmatter for human readability)
// to schema.org's MedicalSpecialty enum URLs. The enum is constrained — free-form
// strings are rejected by validators. There's no Bariatric or HPB enum member,
// so those collapse to Gastroenterologic; oncology procedures get both
// Gastroenterologic and Oncologic.
const SPECIALTY_TO_ENUM: Record<string, string | string[]> = {
  'Surgical Gastroenterology': 'https://schema.org/Gastroenterologic',
  'Gastroenterology': 'https://schema.org/Gastroenterologic',
  'Hepato-Pancreatico-Biliary Surgery': 'https://schema.org/Gastroenterologic',
  'Surgical Oncology (GI)': ['https://schema.org/Gastroenterologic', 'https://schema.org/Oncologic'],
  'Surgical Oncology': ['https://schema.org/Surgical', 'https://schema.org/Oncologic'],
  'Bariatric Surgery': 'https://schema.org/Gastroenterologic',
  'Advanced Laparoscopic Surgery': 'https://schema.org/Surgical',
  'Laparoscopic Surgery': 'https://schema.org/Surgical',
};

function specialtyEnum(freeForm: string | undefined): string | string[] {
  return SPECIALTY_TO_ENUM[freeForm ?? ''] ?? 'https://schema.org/Gastroenterologic';
}

// Entity-form MedicalSpecialty for richer KG anchoring on MedicalCondition pages.
// Each entity carries the schema.org enum URL as @id (so validators recognise the
// enum membership) PLUS Wikipedia/Wikidata sameAs for entity disambiguation.
type SpecialtyEntity = {
  '@type': 'MedicalSpecialty';
  '@id': string;
  name: string;
  sameAs?: string[];
};

const SPECIALTY_TO_ENTITY: Record<string, SpecialtyEntity[]> = {
  'Surgical Gastroenterology': [
    {
      '@type': 'MedicalSpecialty',
      '@id': 'https://schema.org/Gastroenterologic',
      name: 'Surgical Gastroenterology',
      sameAs: [
        'https://en.wikipedia.org/wiki/Digestive_system_surgery',
        'https://www.wikidata.org/wiki/Q5275614',
      ],
    },
  ],
  'Hepato-Pancreatico-Biliary Surgery': [
    {
      '@type': 'MedicalSpecialty',
      '@id': 'https://schema.org/Gastroenterologic',
      name: 'Hepato-Pancreatico-Biliary Surgery',
      sameAs: [
        'https://en.wikipedia.org/wiki/Digestive_system_surgery',
        'https://www.wikidata.org/wiki/Q5275614',
      ],
    },
  ],
  'Surgical Oncology (GI)': [
    {
      '@type': 'MedicalSpecialty',
      '@id': 'https://schema.org/Oncologic',
      name: 'Surgical Oncology',
      sameAs: [
        'https://en.wikipedia.org/wiki/Surgical_oncology',
        'https://www.wikidata.org/wiki/Q3545481',
      ],
    },
    {
      '@type': 'MedicalSpecialty',
      '@id': 'https://schema.org/Gastroenterologic',
      name: 'Surgical Gastroenterology',
      sameAs: [
        'https://en.wikipedia.org/wiki/Digestive_system_surgery',
        'https://www.wikidata.org/wiki/Q5275614',
      ],
    },
  ],
  'Bariatric Surgery': [
    {
      '@type': 'MedicalSpecialty',
      '@id': 'https://schema.org/Gastroenterologic',
      name: 'Bariatric Surgery',
      sameAs: [
        'https://en.wikipedia.org/wiki/Bariatric_surgery',
        'https://www.wikidata.org/wiki/Q357503',
      ],
    },
  ],
};

// Returns one entity, an array of entities, or undefined.
// Fallback (unmapped specialty) emits a minimal entity wrapping the default enum.
function specialtyEntity(freeForm: string | undefined): SpecialtyEntity | SpecialtyEntity[] | undefined {
  if (!freeForm) return undefined;
  const entities = SPECIALTY_TO_ENTITY[freeForm];
  if (!entities) {
    return {
      '@type': 'MedicalSpecialty',
      '@id': 'https://schema.org/Gastroenterologic',
      name: freeForm,
    };
  }
  return entities.length === 1 ? entities[0] : entities;
}

// Map an array of free-form specialty strings to a deduped array of enum URLs.
// Use for entities that carry multiple specialties (Physician, MedicalClinic).
function specialtyEnumArray(freeForms: string[] | undefined): string[] {
  if (!freeForms || freeForms.length === 0) return ['https://schema.org/Gastroenterologic'];
  const out = new Set<string>();
  for (const s of freeForms) {
    const mapped = specialtyEnum(s);
    if (Array.isArray(mapped)) mapped.forEach((u) => out.add(u));
    else out.add(mapped);
  }
  return Array.from(out);
}

export function medicalConditionNode(opts: {
  origin: string;
  condition: Condition;
  orgId: string;
  treatmentIds: string[];
}) {
  const { origin, condition, treatmentIds } = opts;
  const d = condition.data;

  return {
    '@type': 'MedicalCondition',
    '@id': ids.condition(origin, d.slug),
    name: d.title,
    alternateName: d.alternateName,
    description: d.shortDescription,
    sameAs: d.sameAs,
    code: d.icd10Code
      ? {
          '@type': 'MedicalCode',
          codeValue: d.icd10Code,
          codingSystem: 'ICD-10',
        }
      : undefined,
    signOrSymptom: d.signOrSymptom.map((s) => ({
      '@type': 'MedicalSignOrSymptom',
      name: s,
    })),
    riskFactor: d.riskFactor.map((r) => ({
      '@type': 'MedicalRiskFactor',
      name: r,
    })),
    associatedAnatomy: d.associatedAnatomy
      ? {
          '@type': 'AnatomicalStructure',
          name: d.associatedAnatomy.name,
          sameAs: d.associatedAnatomy.sameAs,
        }
      : undefined,
    relevantSpecialty: specialtyEntity(d.relevantSpecialty),
    possibleTreatment: treatmentIds.map(ref),
  };
}

// -----------------------------------------------------------------------------
// Structural nodes. WebSite, WebPage, BreadcrumbList, FAQPage.
// -----------------------------------------------------------------------------

export function webSiteNode(opts: {
  origin: string;
  org: Organization;
  primaryDoctorId?: string;
  foundingYear?: string;
}) {
  const { origin, org, primaryDoctorId, foundingYear } = opts;
  return {
    '@type': 'WebSite',
    '@id': ids.website(origin),
    url: origin,
    name: org.data.name,
    description: org.data.description,
    inLanguage: SITE_LANG,
    publisher: ref(ids.organization(origin)),
    copyrightHolder: ref(ids.organization(origin)),
    copyrightYear: foundingYear,
    creator: primaryDoctorId ? ref(primaryDoctorId) : undefined,
  };
}

export function webPageNode(opts: {
  pageUrl: string;
  title: string;
  description: string;
  breadcrumbId: string;
  primaryEntityId?: string;
  websiteId: string;
  primaryImageUrl?: string;
  datePublished?: string;
  dateModified?: string;
  reviewedById?: string;            // Physician @id for medically reviewed pages
  lastReviewed?: string;            // ISO date, e.g. "2026-04-28"
  pageType?: PageType;
  inLanguage?: string;
}) {
  const {
    pageUrl, title, description, breadcrumbId, primaryEntityId, websiteId,
    primaryImageUrl, datePublished, dateModified, reviewedById, lastReviewed,
    pageType, inLanguage,
  } = opts;
  // Use MedicalWebPage subtype on YMYL medical pages — Google reads this as a YMYL hint.
  const type =
    pageType === 'service' || pageType === 'condition' || pageType === 'category'
      ? 'MedicalWebPage'
      : 'WebPage';
  return {
    '@type': type,
    '@id': ids.webPage(pageUrl),
    url: pageUrl,
    name: title,
    description,
    isPartOf: ref(websiteId),
    breadcrumb: ref(breadcrumbId),
    mainEntity: primaryEntityId ? ref(primaryEntityId) : undefined,
    primaryImageOfPage: primaryImageUrl
      ? { '@type': 'ImageObject', url: primaryImageUrl }
      : undefined,
    datePublished,
    dateModified,
    reviewedBy: reviewedById ? ref(reviewedById) : undefined,
    lastReviewed,
    audience: type === 'MedicalWebPage'
      ? { '@type': 'MedicalAudience', audienceType: 'Patient' }
      : undefined,
    inLanguage: inLanguage ?? SITE_LANG,
  };
}

export function breadcrumbListNode(opts: {
  pageUrl: string;
  items: Array<{ name: string; url: string }>;
}) {
  const { pageUrl, items } = opts;
  return {
    '@type': 'BreadcrumbList',
    '@id': ids.breadcrumb(pageUrl),
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqPageNode(opts: {
  pageUrl: string;
  questions: Array<{ question: string; answer: string }>;
}) {
  const { pageUrl, questions } = opts;
  return {
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faqpage`,
    inLanguage: SITE_LANG,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['details.faq summary', 'details.faq .faq-body'],
    },
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
}

// -----------------------------------------------------------------------------
// Page composer. Picks which entities get fully declared vs. referenced.
// -----------------------------------------------------------------------------

export type PageType =
  | 'home'
  | 'doctor'
  | 'service'
  | 'category'
  | 'condition'
  | 'location'
  | 'faq'
  | 'article'
  | 'generic';

export interface PageGraphInput {
  site: URL;
  pageUrl: string;
  pageType: PageType;
  pageTitle: string;
  pageDescription: string;
  breadcrumbs: Array<{ name: string; url: string }>;
  org: Organization;
  primaryDoctor: Doctor;
  allDoctors: Doctor[];
  primaryLocation: Location;
  allLocations: Location[];
  allServices: Service[];
  allConditions?: Condition[];
  service?: Service;
  category?: Category;
  condition?: Condition;
  location?: Location;
  doctor?: Doctor;
  article?: ArticleInput;
  faq?: Array<{ question: string; answer: string }>;
}

export function buildPageGraph(input: PageGraphInput) {
  const origin = input.site.origin;
  const nodes: Array<Record<string, unknown>> = [];

  const orgId = ids.organization(origin);
  const websiteId = ids.website(origin);
  const breadcrumbId = ids.breadcrumb(input.pageUrl);
  const primaryPhysicianId = ids.physician(origin, input.primaryDoctor.data.entityKey);

  // Build a Wikipedia-URL → MedicalCondition @id map so Physician.knowsAbout
  // can link to real condition entities by id (Gondi: prefer @id refs over inline).
  const conditionIdMap: Record<string, string> = {};
  for (const c of input.allConditions ?? []) {
    const cid = ids.condition(origin, c.data.slug);
    for (const url of c.data.sameAs ?? []) {
      if (/wikipedia\.org/.test(url)) conditionIdMap[url] = cid;
    }
  }

  // Always: WebSite + BreadcrumbList + WebPage
  const foundingYear = input.org.data.foundingDate?.slice(0, 4);
  nodes.push(
    webSiteNode({
      origin,
      org: input.org,
      primaryDoctorId: primaryPhysicianId,
      foundingYear,
    })
  );
  nodes.push(breadcrumbListNode({ pageUrl: input.pageUrl, items: input.breadcrumbs }));

  // Anchor entities — always present so each page's @graph resolves standalone.
  // Each is emitted as a FULL node on its home page, otherwise as a typed stub
  // (anchor identity + sameAs only). LLMs and non-Google crawlers don't reliably
  // follow cross-document @id references, so the stubs make the graph self-contained.
  const primaryClinicId = ids.clinic(origin, input.primaryLocation.data.entityKey);
  const isOrgHome = input.pageType === 'home';
  const isDoctorHome = input.pageType === 'doctor';
  const isClinicHome = input.pageType === 'location';

  // Apollo is external — always a stub, never fully owned by a page on this site.
  nodes.push(apolloHospitalsNode(origin));

  if (isOrgHome) {
    const clinicIds = input.allLocations.map((l) => ids.clinic(origin, l.data.entityKey));
    const offerIds = (input.org.data.offers ?? []).flatMap((ref) => {
      const service = input.allServices.find((s) => s.id === ref.id || s.data.slug === ref.id);
      if (!service) return [];
      return [
        {
          id: ids.procedure(origin, service.data.slug),
          name: service.data.title,
          description: service.data.shortDescription,
        },
      ];
    });
    nodes.push(
      organizationNode({
        origin,
        org: input.org,
        founderId: primaryPhysicianId,
        clinicIds,
        offerIds,
        primaryCityName: input.org.data.areaServed[0]?.name ?? '',
      })
    );
  } else {
    nodes.push(organizationStubNode(origin, input.org));
  }

  if (isDoctorHome) {
    const doctor = input.doctor ?? input.primaryDoctor;
    const clinicIds = input.allLocations.map((l) => ids.clinic(origin, l.data.entityKey));
    // Bidirectional Physician → Procedure: list every shipped service procedure.
    const procedureIds = input.allServices.map((s) => ids.procedure(origin, s.data.slug));
    // Emit each peer-reviewed publication as its own ScholarlyArticle node and
    // collect their @ids so the Physician node can reference them via subjectOf.
    const publicationIds: string[] = [];
    for (const p of doctor.data.publications ?? []) {
      const slug = publicationSlug(p.title);
      publicationIds.push(ids.publication(origin, slug));
      nodes.push(
        publicationNode({
          origin,
          publication: p,
          authorId: primaryPhysicianId,
        })
      );
    }
    nodes.push(
      physicianNode({
        origin,
        doctor,
        orgId,
        clinicIds,
        procedureIds,
        publicationIds,
        conditionIdMap,
        profileUrl: input.pageUrl,
      })
    );
  } else {
    nodes.push(physicianStubNode(origin, input.primaryDoctor));
  }

  if (isClinicHome) {
    const location = input.location ?? input.primaryLocation;
    nodes.push(
      medicalClinicNode({
        origin,
        location,
        orgId,
      })
    );
  } else {
    nodes.push(medicalClinicStubNode(origin, input.primaryLocation));
  }

  // Entity that is the "primary topic" of this page
  let primaryEntityId: string | undefined;

  if (isOrgHome) {
    primaryEntityId = orgId;
  } else if (isDoctorHome) {
    primaryEntityId = primaryPhysicianId;
  } else if (isClinicHome) {
    primaryEntityId = primaryClinicId;
  } else if (input.pageType === 'service' && input.service) {
    const physicianId = ids.physician(origin, input.primaryDoctor.data.entityKey);
    nodes.push(
      medicalProcedureNode({
        origin,
        service: input.service,
        physicianId,
        orgId,
      })
    );
    const faqNode = faqPageFromService({
      pageUrl: input.pageUrl,
      service: input.service,
    });
    if (faqNode) nodes.push(faqNode);
    primaryEntityId = ids.procedure(origin, input.service.data.slug);
  } else if (input.pageType === 'category' && input.category) {
    nodes.push(
      categoryNode({
        origin,
        category: input.category,
      })
    );
    primaryEntityId = ids.category(origin, input.category.data.slug);
  } else if (input.pageType === 'condition' && input.condition) {
    // Resolve possibleTreatment refs to service entries. Inline a minimal
    // MedicalProcedure stub for each so the @id reference in MedicalCondition
    // resolves within the same @graph (Google does not reliably stitch
    // dangling @id refs across pages). Full procedure entity remains defined
    // on its own /gi-services/.../<slug>/ page.
    const segMap: Record<string, string> = {
      laparoscopic: 'laparoscopic-surgery',
      hpb: 'hpb-surgery',
      oncology: 'gi-oncology',
      bariatric: 'bariatric-surgery',
      'upper-gi': 'upper-gi-surgery',
    };
    const treatmentIds: string[] = [];
    const treatmentStubs: Array<Record<string, unknown>> = [];
    for (const t of input.condition.data.possibleTreatment) {
      const slug = typeof t === 'string' ? t : t.id;
      const service = input.allServices.find((s) => s.data.slug === slug);
      if (!service) continue;
      const procId = ids.procedure(origin, slug);
      treatmentIds.push(procId);
      const seg = segMap[service.data.category];
      const procUrl = seg
        ? `${origin}/gi-services/${seg}/${slug}/`
        : `${origin}/gi-services/${slug}/`;
      treatmentStubs.push({
        '@type': 'MedicalProcedure',
        '@id': procId,
        name: service.data.h1 ?? service.data.title,
        description: service.data.shortDescription,
        url: procUrl,
        sameAs: service.data.sameAs,
      });
    }
    nodes.push(
      medicalConditionNode({
        origin,
        condition: input.condition,
        orgId,
        treatmentIds,
      })
    );
    nodes.push(...treatmentStubs);
    primaryEntityId = ids.condition(origin, input.condition.data.slug);
  } else if (input.pageType === 'article' && input.article) {
    // Resolve relatedService → MedicalProcedure @id (and infer condition refs from
    // that procedure's `relatedConditions`, if any).
    const data = input.article.entry.data;
    let mentionsProcedureIds: string[] = [];
    let aboutConditionIds: string[] = [];
    const relatedServicePath = ('relatedService' in data ? data.relatedService : undefined) as string | undefined;
    if (relatedServicePath) {
      const slug = relatedServicePath.split('/').filter(Boolean).pop();
      const matched = input.allServices.find((s) => s.data.slug === slug);
      if (matched) {
        mentionsProcedureIds = [ids.procedure(origin, matched.data.slug)];
        aboutConditionIds = matched.data.relatedConditions
          .map((c) => (typeof c === 'string' ? c : c.id))
          .map((cid) => ids.condition(origin, cid));
      }
    }

    // Estimate word count from the markdown body for content-depth signal.
    const body = (input.article.entry as { body?: string }).body ?? '';
    const wordCount = body.split(/\s+/).filter(Boolean).length || undefined;

    nodes.push(
      articleNode({
        origin,
        pageUrl: input.pageUrl,
        article: input.article,
        authorId: primaryPhysicianId,
        publisherId: orgId,
        aboutConditionIds,
        mentionsProcedureIds,
        wordCount,
      })
    );
    primaryEntityId = ids.article(input.pageUrl);
  }

  if (input.faq && input.faq.length > 0) {
    nodes.push(faqPageNode({ pageUrl: input.pageUrl, questions: input.faq }));
    if (input.pageType === 'faq') {
      primaryEntityId = `${input.pageUrl}#faqpage`;
    }
  }

  // For article pages, propagate the article's dates onto WebPage too.
  let webPageDates: { datePublished?: string; dateModified?: string } = {};
  if (input.pageType === 'article' && input.article) {
    const data = input.article.entry.data;
    webPageDates = {
      datePublished: data.publishedAt,
      dateModified: ('updatedAt' in data ? data.updatedAt : undefined) ?? data.publishedAt,
    };
  }

  // YMYL pages (procedures, categories, conditions) carry a medical reviewer + last review date.
  const isYmyl =
    input.pageType === 'service' ||
    input.pageType === 'category' ||
    input.pageType === 'condition';

  nodes.push(
    webPageNode({
      pageUrl: input.pageUrl,
      title: input.pageTitle,
      description: input.pageDescription,
      breadcrumbId,
      primaryEntityId,
      websiteId,
      pageType: input.pageType,
      reviewedById: isYmyl ? primaryPhysicianId : undefined,
      lastReviewed: isYmyl ? new Date().toISOString().slice(0, 10) : undefined,
      ...webPageDates,
    })
  );

  return {
    '@context': 'https://schema.org',
    '@graph': nodes.map(stripUndefined),
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function absolute(origin: string, path: string) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildPostalAddress(addr: {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
  citySameAs?: string[];
}) {
  return {
    '@type': 'PostalAddress',
    streetAddress: addr.streetAddress || undefined,
    addressLocality: addr.addressLocality
      ? {
          '@type': 'City',
          name: addr.addressLocality,
          sameAs: addr.citySameAs,
        }
      : undefined,
    addressRegion: addr.addressRegion || undefined,
    postalCode: addr.postalCode || undefined,
    addressCountry: addr.addressCountry,
  };
}

function findCitySameAs(
  areaServed: Array<{ name: string; sameAs: string[] }>,
  name: string
): string[] {
  const match = areaServed.find((p) => p.name === name);
  return match?.sameAs ?? [];
}

export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((v) => stripUndefined(v))
      .filter((v) => !isEmpty(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const clean = stripUndefined(v);
      if (isEmpty(clean)) continue;
      out[k] = clean;
    }
    return out as T;
  }
  return value;
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string' && v === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}
