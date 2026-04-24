// Single source of truth for the GI Services mega-menu.
// Consumed by the desktop dropdown panel and the mobile accordion.

export interface MegaMenuItem {
  eyebrow: string;
  title: string;
  subline: string;
  href: string;
}

export const giServicesMenu: readonly MegaMenuItem[] = [
  { eyebrow: 'Fig. 01', title: 'Surgical Gastroenterology', subline: 'Full GI spectrum',                href: '/gi-services/surgical-gastroenterology' },
  { eyebrow: 'Fig. 02', title: 'Laparoscopic Surgery',      subline: 'Minimally invasive, faster recovery', href: '/gi-services/laparoscopic-surgery' },
  { eyebrow: 'Fig. 03', title: 'Upper GI Surgery',           subline: 'Esophagus and stomach',            href: '/gi-services/upper-gi-surgery' },
  { eyebrow: 'Fig. 04', title: 'HPB Surgery',                subline: 'Liver, pancreas, bile duct',       href: '/gi-services/hpb-surgery' },
  { eyebrow: 'Fig. 05', title: 'GI Oncology',                subline: 'Cancer surgery, curative intent',  href: '/gi-services/gi-oncology' },
  { eyebrow: 'Fig. 06', title: 'Bariatric Surgery',          subline: 'Metabolic weight loss',            href: '/gi-services/bariatric-surgery' },
  { eyebrow: 'Procedures', title: 'Endoscopy',               subline: 'Day-care, under sedation',         href: '/gi-services/endoscopy' },
  { eyebrow: 'Procedures', title: 'Colonoscopy',             subline: 'Screening and diagnostic',         href: '/gi-services/colonoscopy' },
] as const;
