import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://drdwarakanathreddy.com',
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: false },
    imageService: false,
  }),
  integrations: [icon()],
  // Permanent (301) redirects for legacy short-form category URLs.
  // Procedure URLs were originally /gi-services/{shortname}/{slug} but the
  // category landing page used the long form (e.g. /gi-services/laparoscopic-surgery),
  // so we standardised on the long form everywhere. These redirects preserve any
  // pre-existing inbound links (and the noindex'd staging URLs) without breakage.
  redirects: {
    '/gi-services/laparoscopic/gallbladder-surgery': '/gi-services/laparoscopic-surgery/gallbladder-surgery',
    '/gi-services/laparoscopic/hernia-surgery': '/gi-services/laparoscopic-surgery/hernia-surgery',
    '/gi-services/laparoscopic/etep-hernia': '/gi-services/laparoscopic-surgery/etep-hernia',
    '/gi-services/hpb/liver-tumor-surgery': '/gi-services/hpb-surgery/liver-tumor-surgery',
    '/gi-services/hpb/pancreatic-surgery': '/gi-services/hpb-surgery/pancreatic-surgery',
    '/gi-services/bariatric/gastric-bypass': '/gi-services/bariatric-surgery/gastric-bypass',
    '/gi-services/bariatric/sleeve-gastrectomy': '/gi-services/bariatric-surgery/sleeve-gastrectomy',
    // Bare short-form category URLs (404 today) → long-form landing page
    '/gi-services/laparoscopic': '/gi-services/laparoscopic-surgery',
    '/gi-services/hpb': '/gi-services/hpb-surgery',
    '/gi-services/bariatric': '/gi-services/bariatric-surgery',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
