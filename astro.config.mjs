import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://drdwarakanathreddy.com',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});
