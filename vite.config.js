import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Sépare les grosses dépendances : meilleur cache navigateur,
        // chargement parallèle, et re-déploiements plus légers.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('xlsx'))   return 'vendor-xlsx';
          if (id.includes('lucide')) return 'vendor-icons';
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          return 'vendor'; // recharts + d3 + utilitaires — une seule direction d'imports, pas de cycle
        },
      },
    },
  },
});
