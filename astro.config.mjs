import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://utm.aprovatotal.com.br',
  server: { port: 4330, host: true },
  devToolbar: { enabled: false },
  vite: {
    server: {
      fs: { allow: ['..'] }
    }
  }
});
