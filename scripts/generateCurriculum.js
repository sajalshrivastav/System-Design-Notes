import fs from 'fs';
import path from 'path';

// ── Parse metadata out of a markdown file ────────────────────────────────────
function parseMd(filePath, phaseDir, file) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Day number — from filename first, then content
  let dayNum = null;
  // Match "Day-1" or just "1"
  const fnMatch = file.match(/(?:Day-?)?(\d+)/i);
  if (fnMatch) dayNum = parseInt(fnMatch[1]);
  if (!dayNum) {
    const hMatch = content.match(/(?:Day|Phase)\s+(\d+)/i);
    if (hMatch) dayNum = parseInt(hMatch[1]);
  }
  if (!dayNum) dayNum = Math.floor(Math.random() * 900) + 100;

  // Title — ## Topic: ... or first H1
  let title = 'Coming Soon';
  const topicMatch = content.match(/##\s*Topic:\s*(.*)/i);
  if (topicMatch) {
    title = topicMatch[1].trim();
  } else {
    const h1Match = content.match(/^#\s+(.*?)$/m);
    if (h1Match) {
      title = h1Match[1]
        .replace(/Frontend System Design/i, '')
        .replace(/(?:Day|Phase)\s*\d+/i, '')
        .replace(/[—:]/g, '')
        .trim();
    }
  }
  if (!title) title = `Phase ${dayNum} Notes`;

  // Study time
  let time = '1 hr';
  const timeMatch = content.match(/\*\*Study time:\*\*\s*(.*?)\s*\|/i);
  if (timeMatch) time = timeMatch[1].trim().replace('hour', 'hr').replace('hours', 'hrs');

  // Difficulty
  let difficulty = 'Beginner';
  const diffMatch = content.match(/\*\*Difficulty:\*\*\s*(.*?)\s*(?:$|\r|\n|\|)/m);
  if (diffMatch) difficulty = diffMatch[1].trim();

  // Stars from interview frequency
  let stars = 5;
  const starLine = content.split('\n').find(l => l.includes('**Interview frequency:**'));
  if (starLine) stars = (starLine.match(/⭐/g) || []).length || 5;

  return { dayNum, title, time, difficulty, stars };
}

// ── Main generator ────────────────────────────────────────────────────────────
export function generateCurriculum() {
  const contentDir = path.resolve(process.cwd(), 'public', 'content');
  const outputPath = path.resolve(process.cwd(), 'public', 'notes.json');

  if (!fs.existsSync(contentDir)) {
    console.warn('⚠️  public/content/ not found — skipping generation');
    return;
  }

  const result = {};

  // Each subfolder of public/content/ is a track (system-design, javascript, etc.)
  const trackDirs = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const trackDir of trackDirs) {
    const trackId   = trackDir.name;                          // e.g. "system-design"
    const trackPath = path.join(contentDir, trackId);

    // Read optional track.json for metadata
    const trackConfigPath = path.join(trackPath, 'track.json');
    const trackConfig = fs.existsSync(trackConfigPath)
      ? JSON.parse(fs.readFileSync(trackConfigPath, 'utf-8'))
      : { label: trackId, available: false };

    // Each subfolder of the track is a Phase (formerly Week)
    const phaseDirs = fs.readdirSync(trackPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && /(?:week|phase)/i.test(d.name))
      .sort((a, b) => {
        const na = parseInt(a.name.match(/\d+/)?.[0] || 0);
        const nb = parseInt(b.name.match(/\d+/)?.[0] || 0);
        return na - nb;
      });

    const weeks = []; // We keep the key name "weeks" in JSON for compatibility or rename to "phases" if UI supports it.
    // Looking at useNotes.js, it expects .weeks. Let's keep the key but update the labels.

    for (const phaseDir of phaseDirs) {
      const phaseMatch = phaseDir.name.match(/(\d+)/);
      if (!phaseMatch) continue;
      const phaseNum  = parseInt(phaseMatch[1]);
      const phasePath = path.join(trackPath, phaseDir.name);

      // Read optional week.json/phase.json for label
      const phaseConfigPath = path.join(phasePath, 'phase.json');
      const weekConfigPath = path.join(phasePath, 'week.json');
      const configPath = fs.existsSync(phaseConfigPath) ? phaseConfigPath : weekConfigPath;
      
      const phaseConfig = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        : { label: `Phase ${phaseNum}` };

      // Collect all .md files in this phase
      const mdFiles = fs.readdirSync(phasePath)
        .filter(f => f.endsWith('.md'))
        .sort((a, b) => {
          const na = parseInt(a.match(/\d+/)?.[0] || 0);
          const nb = parseInt(b.match(/\d+/)?.[0] || 0);
          return na - nb;
        });

      const days = mdFiles.map(file => {
        const filePath = path.join(phasePath, file);
        const { dayNum, title, time, difficulty, stars } = parseMd(filePath, phaseDir.name, file);
        return {
          day: dayNum,
          title,
          // path relative to public/ 
          file: `content/${trackId}/${phaseDir.name}/${file}`,
          stars,
          difficulty,
          time,
        };
      });

      days.sort((a, b) => a.day - b.day);

      if (days.length > 0) {
        weeks.push({ week: phaseNum, label: phaseConfig.label, days });
      }
    }

    result[trackId] = {
      label:     trackConfig.label,
      available: trackConfig.available ?? false,
      weeks,
    };
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  const totalFiles = Object.values(result)
    .flatMap(t => t.weeks)
    .flatMap(w => w.days).length;
  console.log(`✅ notes.json generated — ${totalFiles} lessons across ${Object.keys(result).length} tracks`);
}
