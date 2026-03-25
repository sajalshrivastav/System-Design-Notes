import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { generateCurriculum } from './scripts/generateCurriculum.js';

// Custom Vite Plugin to auto-generate notes.json
function autoCurriculumPlugin() {
  return {
    name: 'auto-curriculum',
    buildStart() {
      // Runs on server startup and production build
      generateCurriculum();
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.md') && file.includes('Week')) {
        console.log(`\n📄 Markdown updated: ${file.split(/[\/\\]/).pop()}`);
        generateCurriculum();
        // Option to trigger full reload if notes.json is only loaded once
        server.ws.send({ type: 'full-reload' });
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoCurriculumPlugin()],
})
