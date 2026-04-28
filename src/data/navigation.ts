export type NavItem = {
  label: string;
  href?: string;
  children?: NavItem[];
  phase?: '1' | '2';
};

export const primaryNav: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'GI Services',
    href: '/gi-services',
    children: [
      { label: 'Surgical Gastroenterology', href: '/gi-services/surgical-gastroenterology', phase: '1' },
      {
        label: 'Laparoscopic Surgery',
        href: '/gi-services/laparoscopic-surgery',
        phase: '1',
        children: [
          { label: 'Gallbladder Surgery', href: '/gi-services/laparoscopic-surgery/gallbladder-surgery', phase: '1' },
          { label: 'Hernia Surgery', href: '/gi-services/laparoscopic-surgery/hernia-surgery', phase: '1' },
          { label: 'eTEP Hernia Surgery', href: '/gi-services/laparoscopic-surgery/etep-hernia', phase: '1' },
          { label: 'Appendix Surgery', href: '/gi-services/laparoscopic-surgery/appendix-surgery', phase: '2' },
          { label: 'Anti-reflux Surgery', href: '/gi-services/laparoscopic-surgery/anti-reflux-surgery', phase: '2' },
        ],
      },
      {
        label: 'Upper GI Surgery',
        href: '/gi-services/upper-gi-surgery',
        phase: '2',
        children: [
          { label: 'Esophagus Surgery', href: '/gi-services/upper-gi/esophagus-surgery', phase: '2' },
          { label: 'Stomach Surgery', href: '/gi-services/upper-gi/stomach-surgery', phase: '2' },
        ],
      },
      {
        label: 'HPB Surgery',
        href: '/gi-services/hpb-surgery',
        phase: '1',
        children: [
          { label: 'Liver Tumor Surgery', href: '/gi-services/hpb-surgery/liver-tumor-surgery', phase: '1' },
          { label: 'Pancreatic Surgery', href: '/gi-services/hpb-surgery/pancreatic-surgery', phase: '1' },
          { label: 'Bile Duct Surgery', href: '/gi-services/hpb-surgery/bile-duct-surgery', phase: '2' },
          { label: 'Gallbladder Cancer Surgery', href: '/gi-services/hpb-surgery/gallbladder-cancer-surgery', phase: '2' },
        ],
      },
      {
        label: 'GI Oncology',
        href: '/gi-services/gi-oncology',
        phase: '1',
        children: [
          { label: 'Stomach Cancer Surgery', href: '/gi-services/gi-oncology/stomach-cancer-surgery', phase: '1' },
          { label: 'Colon Cancer Surgery', href: '/gi-services/gi-oncology/colon-cancer-surgery', phase: '1' },
          { label: 'Rectal Cancer Surgery', href: '/gi-services/gi-oncology/rectal-cancer-surgery', phase: '2' },
          { label: 'Esophageal Cancer Surgery', href: '/gi-services/gi-oncology/esophageal-cancer-surgery', phase: '2' },
        ],
      },
      {
        label: 'Bariatric Surgery',
        href: '/gi-services/bariatric-surgery',
        phase: '1',
        children: [
          { label: 'Gastric Bypass', href: '/gi-services/bariatric-surgery/gastric-bypass', phase: '1' },
          { label: 'Sleeve Gastrectomy', href: '/gi-services/bariatric-surgery/sleeve-gastrectomy', phase: '1' },
          { label: 'Revision Bariatric Surgery', href: '/gi-services/bariatric-surgery/revision', phase: '2' },
        ],
      },
      { label: 'Endoscopy', href: '/gi-services/endoscopy', phase: '1' },
      { label: 'Colonoscopy', href: '/gi-services/colonoscopy', phase: '1' },
    ],
  },
  { label: 'About', href: '/about-doctor' },
  { label: 'Patient Resources', href: '/patient-resources', phase: '1' },
  { label: 'Success Stories', href: '/success-stories', phase: '1' },
  { label: 'Interesting Cases', href: '/case-studies', phase: '1' },
  { label: 'Blogs', href: '/blogs', phase: '1' },
  { label: 'Videos', href: '/videos', phase: '1' },
  { label: 'Contact', href: '/contact' },
];

export const footerSections: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Quick Links',
    links: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about-doctor' },
      { label: 'GI Services', href: '/gi-services' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Surgical Services',
    links: [
      { label: 'Surgical Gastroenterology', href: '/gi-services/surgical-gastroenterology' },
      { label: 'Laparoscopic Surgery', href: '/gi-services/laparoscopic-surgery' },
      { label: 'HPB Surgery', href: '/gi-services/hpb-surgery' },
      { label: 'GI Oncology', href: '/gi-services/gi-oncology' },
      { label: 'Bariatric Surgery', href: '/gi-services/bariatric-surgery' },
    ],
  },
  {
    title: 'Procedures',
    links: [
      { label: 'Endoscopy', href: '/gi-services/endoscopy' },
      { label: 'Colonoscopy', href: '/gi-services/colonoscopy' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blogs', href: '/blogs' },
      { label: 'FAQs', href: '/faqs' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { label: 'Success Stories', href: '/success-stories' },
      { label: 'Case Studies', href: '/case-studies' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];
