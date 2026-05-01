import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gastrosurgeonnellore.com',
  // Static by default. Keystatic admin and the contact API opt into SSR via `prerender = false`.
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true },
    imageService: false,
  }),
  // React is required by Keystatic; scoped to /keystatic via include.
  integrations: [
    icon(),
    react({ include: ['**/keystatic/**'] }),
    keystatic(),
    sitemap({
      // Exclude admin and API routes — these aren't crawlable content.
      filter: (page) => !page.includes('/keystatic') && !page.includes('/api/'),
    }),
  ],
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
    // Upper GI procedure URLs (drafted in nav with short form before category was finalised)
    '/gi-services/upper-gi/esophagus-surgery': '/gi-services/upper-gi-surgery/esophagus-surgery',
    '/gi-services/upper-gi/stomach-surgery': '/gi-services/upper-gi-surgery/stomach-surgery',
    // Bare short-form category URLs (404 today) → long-form landing page
    '/gi-services/laparoscopic': '/gi-services/laparoscopic-surgery',
    '/gi-services/hpb': '/gi-services/hpb-surgery',
    '/gi-services/bariatric': '/gi-services/bariatric-surgery',
    '/gi-services/upper-gi': '/gi-services/upper-gi-surgery',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
