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
type Condition = CollectionEntry<'conditions'>;

// -----------------------------------------------------------------------------
// @id helpers
// -----------------------------------------------------------------------------

export const ids = {
  organization: (origin: string) => `${origin}/#organization`,
  website: (origin: string) => `${origin}/#website`,
  physician: (origin: string, slug: string) => `${origin}/#physician-${slug}`,
  clinic: (origin: string, slug: string) => `${origin}/#clinic-${slug}`,
  procedure: (origin: string, slug: string) => `${origin}/#procedure-${slug}`,
  condition: (origin: string, slug: string) => `${origin}/#condition-${slug}`,
  webPage: (pageUrl: string) => `${pageUrl}#webpage`,
  breadcrumb: (pageUrl: string) => `${pageUrl}#breadcrumb`,
};

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
  employeeIds: string[];
  clinicIds: string[];
  offerIds: Array<{ id: string; name: string; description: string }>;
  primaryCityName: string;
}) {
  const { origin, org, founderId, employeeIds, clinicIds, offerIds, primaryCityName } = opts;
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
    logo: d.logo ? absolute(origin, d.logo) : undefined,
    image: d.image ? absolute(origin, d.image) : undefined,
    foundingDate: d.foundingDate,
    knowsLanguage: d.knowsLanguage,
    email: d.email,
    telephone: d.telephone ?? d.contactPoint?.phone,
    medicalSpecialty: ['Surgical Gastroenterology'],
    areaServed: d.areaServed.map((place) => ({
      '@type': place.type,
      name: place.name,
      sameAs: place.sameAs,
    })),
    address: buildPostalAddress({
      streetAddress: '',
      addressLocality: primaryCityName,
      addressRegion: '',
      postalCode: '',
      addressCountry: 'IN',
      citySameAs: findCitySameAs(d.areaServed, primaryCityName),
    }),
    founder: ref(founderId),
    employee: employeeIds.map(ref),
    location: clinicIds.map(ref),
    sameAs: [...d.sameAs, d.knowledgeGraphId].filter(Boolean),
    makesOffer,
    contactPoint,
    potentialAction,
  };
}

export function physicianNode(opts: {
  origin: string;
  doctor: Doctor;
  orgId: string;
  clinicIds: string[];
}) {
  const { origin, doctor, orgId, clinicIds } = opts;
  const d = doctor.data;

  const aggregateRating = d.googleRating
    ? {
        '@type': 'AggregateRating',
        ratingValue: d.googleRating.value,
        reviewCount: d.googleRating.reviewCount,
        bestRating: 5,
        worstRating: 1,
      }
    : undefined;

  return {
    '@type': 'Physician',
    '@id': ids.physician(origin, d.entityKey),
    name: d.name,
    honorificPrefix: d.honorificPrefix,
    jobTitle: d.title,
    description: d.seo?.description,
    image: d.image ? absolute(origin, d.image) : undefined,
    medicalSpecialty: d.medicalSpecialty,
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
    knowsAbout: d.knowsAbout.map((k) => ({
      '@type': 'MedicalCondition',
      name: k.name,
      sameAs: k.sameAs,
    })),
    memberOf: d.memberOf.map((m) => ({
      '@type': 'Organization',
      name: m.name,
      sameAs: m.sameAs,
    })),
    award: d.award.map((a) => ({
      '@type': 'Award',
      name: a.name,
      dateAwarded: a.date,
      url: a.url,
      ...(a.recognizedBy && {
        awarder: {
          '@type': 'Organization',
          name: a.recognizedBy.name,
          sameAs: a.recognizedBy.sameAs,
        },
      }),
    })),
    identifier: d.registrationNumber
      ? {
          '@type': 'PropertyValue',
          propertyID: 'medical-council-registration',
          value: d.registrationNumber,
        }
      : undefined,
    worksFor: ref(orgId),
    workLocation: clinicIds.map(ref),
    aggregateRating,
    sameAs: d.sameAs,
  };
}

export function medicalClinicNode(opts: {
  origin: string;
  location: Location;
  orgId: string;
}) {
  const { origin, location, orgId } = opts;
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
    medicalSpecialty: d.medicalSpecialty,
    parentOrganization: ref(orgId),
    sameAs: d.sameAs,
  };
}

export function medicalProcedureNode(opts: {
  origin: string;
  service: Service;
  physicianId: string;
  orgId: string;
  treatsConditionIds: string[];
}) {
  const { origin, service, physicianId, orgId, treatsConditionIds } = opts;
  const d = service.data;

  const indicationsItems = d.indications;
  const indicationsFromSections = d.sections
    .filter((s): s is Extract<typeof s, { type: 'list' }> => s.type === 'list' && /who needs|who qualifies/i.test(s.title))
    .flatMap((s) => s.items);
  const preparation = [...indicationsItems, ...indicationsFromSections].join('; ') || undefined;

  return {
    '@type': 'MedicalProcedure',
    '@id': ids.procedure(origin, d.slug),
    name: d.h1 ?? d.title,
    alternateName: d.procedureType,
    description: d.shortDescription,
    procedureType: d.procedureType,
    bodyLocation: d.bodyLocation,
    howPerformed: d.approach,
    preparation,
    followup: d.recoveryTime,
    performer: ref(physicianId),
    availableService: ref(orgId),
    relevantSpecialty: d.medicalSpecialty[0] ?? 'Surgical Gastroenterology',
    indication: treatsConditionIds.map((cid) => ({
      '@type': 'MedicalCondition',
      ...ref(cid),
    })),
    sameAs: d.sameAs,
  };
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

export function medicalConditionNode(opts: {
  origin: string;
  condition: Condition;
  orgId: string;
  treatmentIds: string[];
}) {
  const { origin, condition, orgId, treatmentIds } = opts;
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
    relevantSpecialty: d.relevantSpecialty,
    possibleTreatment: treatmentIds.map(ref),
    availableService: ref(orgId),
  };
}

// -----------------------------------------------------------------------------
// Structural nodes. WebSite, WebPage, BreadcrumbList, FAQPage.
// -----------------------------------------------------------------------------

export function webSiteNode(opts: { origin: string; org: Organization }) {
  const { origin, org } = opts;
  return {
    '@type': 'WebSite',
    '@id': ids.website(origin),
    url: origin,
    name: org.data.name,
    description: org.data.description,
    inLanguage: org.data.knowsLanguage.length ? org.data.knowsLanguage[0] : 'en',
    publisher: ref(ids.organization(origin)),
  };
}

export function webPageNode(opts: {
  pageUrl: string;
  title: string;
  description: string;
  breadcrumbId: string;
  primaryEntityId?: string;
  websiteId: string;
  inLanguage?: string;
}) {
  const { pageUrl, title, description, breadcrumbId, primaryEntityId, websiteId, inLanguage } = opts;
  return {
    '@type': 'WebPage',
    '@id': ids.webPage(pageUrl),
    url: pageUrl,
    name: title,
    description,
    isPartOf: ref(websiteId),
    breadcrumb: ref(breadcrumbId),
    mainEntity: primaryEntityId ? ref(primaryEntityId) : undefined,
    inLanguage: inLanguage ?? 'en',
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
  | 'condition'
  | 'location'
  | 'faq'
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
  service?: Service;
  condition?: Condition;
  location?: Location;
  doctor?: Doctor;
  faq?: Array<{ question: string; answer: string }>;
}

export function buildPageGraph(input: PageGraphInput) {
  const origin = input.site.origin;
  const nodes: Array<Record<string, unknown>> = [];

  const orgId = ids.organization(origin);
  const websiteId = ids.website(origin);
  const breadcrumbId = ids.breadcrumb(input.pageUrl);

  // Always: WebSite + BreadcrumbList + WebPage
  nodes.push(webSiteNode({ origin, org: input.org }));
  nodes.push(breadcrumbListNode({ pageUrl: input.pageUrl, items: input.breadcrumbs }));

  // Entity that is the "primary topic" of this page
  let primaryEntityId: string | undefined;

  if (input.pageType === 'home') {
    // Full org; Physician + Clinic appear only as refs
    const clinicIds = input.allLocations.map((l) => ids.clinic(origin, l.data.entityKey));
    const employeeIds = input.allDoctors.map((d) => ids.physician(origin, d.data.entityKey));
    const founderId = ids.physician(origin, input.primaryDoctor.data.entityKey);

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
        founderId,
        employeeIds,
        clinicIds,
        offerIds,
        primaryCityName: input.org.data.areaServed[0]?.name ?? '',
      })
    );
    primaryEntityId = orgId;
  } else if (input.pageType === 'doctor' && input.doctor) {
    const clinicIds = input.allLocations.map((l) => ids.clinic(origin, l.data.entityKey));
    nodes.push(
      physicianNode({
        origin,
        doctor: input.doctor,
        orgId,
        clinicIds,
      })
    );
    primaryEntityId = ids.physician(origin, input.doctor.data.entityKey);
  } else if (input.pageType === 'service' && input.service) {
    const physicianId = ids.physician(origin, input.primaryDoctor.data.entityKey);
    const treatsConditionIds = input.service.data.relatedConditions.map((c) =>
      ids.condition(origin, typeof c === 'string' ? c : c.id)
    );
    nodes.push(
      medicalProcedureNode({
        origin,
        service: input.service,
        physicianId,
        orgId,
        treatsConditionIds,
      })
    );
    const faqNode = faqPageFromService({
      pageUrl: input.pageUrl,
      service: input.service,
    });
    if (faqNode) nodes.push(faqNode);
    primaryEntityId = ids.procedure(origin, input.service.data.slug);
  } else if (input.pageType === 'condition' && input.condition) {
    const treatmentIds = input.condition.data.possibleTreatment.map((t) =>
      ids.procedure(origin, typeof t === 'string' ? t : t.id)
    );
    nodes.push(
      medicalConditionNode({
        origin,
        condition: input.condition,
        orgId,
        treatmentIds,
      })
    );
    primaryEntityId = ids.condition(origin, input.condition.data.slug);
  } else if (input.pageType === 'location' && input.location) {
    nodes.push(
      medicalClinicNode({
        origin,
        location: input.location,
        orgId,
      })
    );
    primaryEntityId = ids.clinic(origin, input.location.data.entityKey);
  }

  if (input.faq && input.faq.length > 0) {
    nodes.push(faqPageNode({ pageUrl: input.pageUrl, questions: input.faq }));
    if (input.pageType === 'faq') {
      primaryEntityId = `${input.pageUrl}#faqpage`;
    }
  }

  nodes.push(
    webPageNode({
      pageUrl: input.pageUrl,
      title: input.pageTitle,
      description: input.pageDescription,
      breadcrumbId,
      primaryEntityId,
      websiteId,
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
