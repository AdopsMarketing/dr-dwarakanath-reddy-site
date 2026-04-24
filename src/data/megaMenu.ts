// Single source of truth for the GI Services mega-menu.
// Consumed by the desktop dropdown panel and the mobile accordion.

export interface MegaMenuItem {
  eyebrow: string;
  title: string;
  subline: string;
  href: string;
}

export const giServicesMenu: readonly MegaMenuItem[] = [
  { eyebrow: 'Super-specialty',    title: 'Surgical Gastroenterology', subline: 'Full GI spectrum',                    href: '/gi-services/surgical-gastroenterology' },
  { eyebrow: 'Minimally invasive', title: 'Laparoscopic Surgery',      subline: 'Smaller cuts, faster recovery',       href: '/gi-services/laparoscopic-surgery' },
  { eyebrow: 'Upper GI',           title: 'Upper GI Surgery',          subline: 'Esophagus and stomach',               href: '/gi-services/upper-gi-surgery' },
  { eyebrow: 'Liver and pancreas', title: 'HPB Surgery',               subline: 'Hepato-Pancreatico-Biliary',          href: '/gi-services/hpb-surgery' },
  { eyebrow: 'Oncology',           title: 'GI Oncology',               subline: 'Cancer surgery, curative intent',     href: '/gi-services/gi-oncology' },
  { eyebrow: 'Bariatric',          title: 'Bariatric Surgery',         subline: 'Metabolic weight loss',               href: '/gi-services/bariatric-surgery' },
  { eyebrow: 'Procedures',         title: 'Endoscopy',                 subline: 'Day-care, under sedation',            href: '/gi-services/endoscopy' },
  { eyebrow: 'Procedures',         title: 'Colonoscopy',               subline: 'Screening and diagnostic',            href: '/gi-services/colonoscopy' },
] as const;
