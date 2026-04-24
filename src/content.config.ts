import { defineCollection, z, reference } from 'astro:content';
import { glob } from 'astro/loaders';

const urlOrTodo = z.string().refine(
  (v) => v.startsWith('{{TODO') || z.string().url().safeParse(v).success,
  { message: 'Must be a valid URL or a {{TODO: ...}} placeholder' }
);
const sameAsArray = z.array(urlOrTodo).default([]);

const placeWithSameAs = z.object({
  name: z.string(),
  type: z.enum(['City', 'AdministrativeArea', 'Country', 'Place']).default('City'),
  sameAs: sameAsArray,
});

const credentialSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  credentialCategory: z.string().optional(),
  recognizedBy: z
    .object({
      name: z.string(),
      sameAs: sameAsArray,
    })
    .optional(),
});

const entityWithSameAs = z.object({
  name: z.string(),
  sameAs: sameAsArray,
});

const awardSchema = z.object({
  name: z.string(),
  date: z.string().optional(),
  recognizedBy: entityWithSameAs.optional(),
  url: urlOrTodo.optional(),
});

const organization = defineCollection({
  loader: glob({ pattern: '**/*.{md,json}', base: './src/content/organization' }),
  schema: z.object({
    name: z.string(),
    legalName: z.string(),
    alternateName: z.array(z.string()).default([]),
    description: z.string(),
    foundingDate: z.string().optional(),
    knowsLanguage: z.array(z.string()).default([]),
    email: z.string().email(),
    telephone: z.string().optional(),
    logo: z.string().optional(),
    image: z.string().optional(),
    areaServed: z.array(placeWithSameAs).default([]),
    sameAs: sameAsArray,
    knowledgeGraphId: z.string().optional(),
    contactPoint: z
      .object({
        phone: z.string(),
        hospitalPhones: z.array(z.string()).default([]),
        contactType: z.string().default('appointments'),
        availableLanguage: z.array(z.string()).default([]),
        areaServed: z.array(z.string()).default([]),
      })
      .optional(),
    bookingUrl: z.string().optional(),
    offers: z.array(reference('services')).default([]),
  }),
});

const doctors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/doctors' }),
  schema: ({ image }) =>
    z.object({
      entityKey: z.string(),
      isPrimary: z.boolean().default(false),
      name: z.string(),
      title: z.string().optional(),
      honorificPrefix: z.string().default('Dr.'),
      image: z.string().optional(),
      photo: image().optional(),
      credentials: z.array(z.string()).default([]),
      hasCredential: z.array(credentialSchema).default([]),
      yearsExperience: z.number().int().nonnegative().optional(),
      medicalSpecialty: z.array(z.string()).default([]),
      knowsAbout: z.array(entityWithSameAs).default([]),
      languages: z.array(z.string()).default(['English']),
      alumniOf: z.array(entityWithSameAs).default([]),
      memberOf: z.array(entityWithSameAs).default([]),
      award: z.array(awardSchema).default([]),
      googleRating: z
        .object({
          value: z.number(),
          reviewCount: z.number().int().nonnegative(),
        })
        .optional(),
      sameAs: sameAsArray,
      registrationNumber: z.string().optional(),
      worksAt: reference('locations').optional(),
      bio: z.string().optional(),
      seo: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
        })
        .optional(),
    }),
});

const proseSection = z.object({
  type: z.literal('prose'),
  title: z.string(),
  body: z.string(),
});

const listSection = z.object({
  type: z.literal('list'),
  title: z.string(),
  intro: z.string().optional(),
  items: z.array(z.string()),
  outro: z.string().optional(),
});

const stepsSection = z.object({
  type: z.literal('steps'),
  title: z.string(),
  intro: z.string().optional(),
  steps: z.array(z.string()),
  outro: z.string().optional(),
});

const timelineSection = z.object({
  type: z.literal('timeline'),
  title: z.string(),
  entries: z.array(z.object({ period: z.string(), detail: z.string() })),
  note: z.string().optional(),
});

const faqsSection = z.object({
  type: z.literal('faqs'),
  title: z.string().default('Frequently asked questions'),
  items: z.array(z.object({ question: z.string(), answer: z.string() })),
});

const serviceSection = z.discriminatedUnion('type', [
  proseSection,
  listSection,
  stepsSection,
  timelineSection,
  faqsSection,
]);

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    h1: z.string().optional(),
    h1Html: z.string().optional(),
    h1Secondary: z.string().optional(),
    slug: z.string(),
    category: z.enum([
      'surgical-care',
      'advanced-surgery',
      'procedures',
      'laparoscopic',
      'hpb',
      'oncology',
      'bariatric',
    ]),
    parent: reference('services').optional(),
    shortDescription: z.string(),
    overview: z.string().optional(),
    indications: z.array(z.string()).default([]),
    procedureType: z.string().optional(),
    typicalDuration: z.string().optional(),
    hospitalStay: z.string().optional(),
    recoveryTime: z.string().optional(),
    anesthesia: z.string().optional(),
    approach: z
      .enum(['laparoscopic', 'open', 'robotic', 'endoscopic', 'minimally-invasive', 'mixed'])
      .optional(),
    bodyLocation: z.string().optional(),
    medicalSpecialty: z.array(z.string()).default([]),
    heroIntro: z.string().optional(),
    heroCta: z
      .object({
        label: z.string(),
        message: z.string(),
      })
      .optional(),
    sections: z.array(serviceSection).default([]),
    closingCta: z
      .object({
        prompt: z.string(),
        label: z.string(),
        message: z.string(),
      })
      .optional(),
    relatedConditions: z.array(reference('conditions')).default([]),
    sameAs: sameAsArray,
    phase: z.enum(['1', '2']).default('1'),
    order: z.number().int().default(100),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.array(z.string()).default([]),
      })
      .optional(),
  }),
});

const categories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/categories' }),
  schema: z.object({
    title: z.string(),
    h1: z.string().optional(),
    h1Html: z.string().optional(),
    h1Secondary: z.string().optional(),
    slug: z.string(),
    shortDescription: z.string(),
    heroIntro: z.string(),
    whatWeCover: z
      .object({
        title: z.string().default('What we offer'),
        items: z.array(
          z.object({
            title: z.string(),
            href: z.string().optional(),
            description: z.string().optional(),
          })
        ),
      })
      .optional(),
    sections: z.array(serviceSection).default([]),
    closingCta: z
      .object({
        prompt: z.string(),
        label: z.string(),
        message: z.string(),
      })
      .optional(),
    order: z.number().int().default(100),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.array(z.string()).default([]),
      })
      .optional(),
  }),
});

const conditions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/conditions' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    shortDescription: z.string(),
    alternateName: z.array(z.string()).default([]),
    sameAs: sameAsArray,
    icd10Code: z.string().optional(),
    signOrSymptom: z.array(z.string()).default([]),
    riskFactor: z.array(z.string()).default([]),
    associatedAnatomy: entityWithSameAs.optional(),
    relevantSpecialty: z.string().optional(),
    possibleTreatment: z.array(reference('services')).default([]),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  }),
});

const locations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/locations' }),
  schema: z.object({
    name: z.string(),
    entityKey: z.string(),
    isPrimary: z.boolean().default(false),
    address: z.object({
      streetAddress: z.string(),
      addressLocality: z.string(),
      addressRegion: z.string(),
      postalCode: z.string(),
      addressCountry: z.string().default('IN'),
      citySameAs: sameAsArray,
    }),
    geo: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .optional(),
    telephone: z.union([z.string(), z.array(z.string())]),
    whatsapp: z.string().optional(),
    email: z.string().email().optional(),
    openingHours: z.string().optional(),
    hours: z
      .array(
        z.object({
          days: z.array(z.string()),
          opens: z.string(),
          closes: z.string(),
        })
      )
      .default([]),
    hasMap: urlOrTodo.optional(),
    mapEmbedUrl: urlOrTodo.optional(),
    image: z.string().optional(),
    medicalSpecialty: z.array(z.string()).default([]),
    sameAs: sameAsArray,
  }),
});

const blogs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blogs' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    excerpt: z.string(),
    publishedAt: z.string(),
    updatedAt: z.string().optional(),
    author: z.string().default('Dr. Dwarakanath Reddy V'),
    reviewedBy: z.string().default('Dr. Dwarakanath Reddy V'),
    category: z.string().optional(),
    relatedService: z.string().optional(),
    relatedServiceLabel: z.string().optional(),
    tags: z.array(z.string()).default([]),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  }),
});

const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    caseNumber: z.string(),
    excerpt: z.string(),
    publishedAt: z.string(),
    conditionName: z.string().optional(),
    procedurePerformed: z.string().optional(),
    outcomeAt: z.string().optional(),
    anonymized: z.boolean().default(true),
    relatedService: z.string().optional(),
    relatedServiceLabel: z.string().optional(),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  }),
});

const stories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stories' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    excerpt: z.string(),
    publishedAt: z.string(),
    condition: z.string().optional(),
    procedure: z.string().optional(),
    outcomeTime: z.string().optional(),
    anonymized: z.boolean().default(true),
    relatedService: z.string().optional(),
    relatedServiceLabel: z.string().optional(),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { organization, doctors, services, categories, conditions, locations, blogs, cases, stories };
