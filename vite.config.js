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
      if (file.endsWith('.md') && file.includes('content')) {
        console.log(`\n📄 Markdown updated: ${file.split(/[\/\\]/).pop()}`);
        generateCurriculum();
        server.ws.send({ type: 'full-reload' });
      }
      // Also regenerate when week.json or track.json changes
      if ((file.endsWith('week.json') || file.endsWith('track.json'))) {
        console.log(`\n⚙️  Config updated: ${file.split(/[\/\\]/).pop()}`);
        generateCurriculum();
        server.ws.send({ type: 'full-reload' });
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoCurriculumPlugin()],
})
