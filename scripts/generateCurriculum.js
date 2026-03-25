import fs from 'fs';
import path from 'path';

export function generateCurriculum() {
  const publicDir = path.resolve(process.cwd(), 'public');
  const dirs = fs.readdirSync(publicDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('Week'));
  
  const weeks = [];
  dirs.forEach(dirent => {
    const weekMatch = dirent.name.match(/Week\s+(\d+)/i);
    if (!weekMatch) return;
    const weekNum = parseInt(weekMatch[1]);
    
    // Look for week metadata or use a default label
    let label = `Phase ${weekNum}`;
    if (weekNum === 1) label = "Foundations";
    if (weekNum === 2) label = "Deep Dive";
    
    const weekPath = path.join(publicDir, dirent.name);
    const files = fs.readdirSync(weekPath).filter(f => f.endsWith('.md'));
    
    const days = [];
    files.forEach(file => {
      const filePath = path.join(weekPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      let dayNum = null;
      
      // 1. Try to get Day from filename (e.g., Day-15.md)
      const dayFileNameMatch = file.match(/Day-(\d+)/i);
      if (dayFileNameMatch) dayNum = parseInt(dayFileNameMatch[1]);
      
      // 2. Try to get Day from the content header (e.g., # System Design — Day 20)
      if (!dayNum) {
        const dayHeaderMatch = content.match(/Day\s+(\d+)/i);
        if (dayHeaderMatch) dayNum = parseInt(dayHeaderMatch[1]);
      }
      
      // 3. Fallback: Assign a unique random ID if nothing else works so the file still appears
      if (!dayNum) dayNum = Math.floor(Math.random() * 900) + 100;
      
      // Default metadata
      let title = "Coming Soon";
      let time = "1 hr";
      let difficulty = "Beginner";
      let stars = 0;
      
      // Parse MarkDown Content
      // Extract from: ## Topic: How the Web Works
      const titleMatch = content.match(/## Topic:\s*(.*)/i);
      if (titleMatch) title = titleMatch[1].trim();
      else {
        // Fallback to primary H1
        const h1Match = content.match(/^#\s+(.*?)$/m);
        if (h1Match) title = h1Match[1].replace(/Frontend System Design/, '').replace(/Day \d+/, '').replace(/—|:/g,'').trim();
      }
      
      // Extract from: > **Study time:** 1 hour | **Phase:** 1 of 5 | **Difficulty:** Beginner
      const timeMatch = content.match(/\*\*Study time:\*\*\s*(.*?)\s*\|/i);
      if (timeMatch && timeMatch[1]) time = timeMatch[1].trim().replace('hour', 'hr');
      
      const diffMatch = content.match(/\*\*Difficulty:\*\*\s*(.*?)\s*(?:$|\r|\n|\|)/m);
      if (diffMatch && diffMatch[1]) difficulty = diffMatch[1].trim();
      
      // Extract from: > **Interview frequency:** ⭐⭐⭐⭐⭐
      const starStr = content.split('\n').find(l => l.includes('**Interview frequency:**'));
      if (starStr) {
         stars = (starStr.match(/⭐/g) || []).length;
      }
      
      if (!title) title = `Day ${dayNum} Notes`;

      days.push({
        day: dayNum,
        title: title,
        file: `${dirent.name}/${file}`,
        stars: stars || 5,
        difficulty: difficulty,
        time: time
      });
    });
    
    days.sort((a, b) => a.day - b.day);
    if (days.length > 0) {
      weeks.push({
        week: weekNum,
        label: label,
        days
      });
    }
  });
  
  weeks.sort((a, b) => a.week - b.week);
  
  // Only write if there's actual parsed content to avoid destroying notes.json with empty data during a fluke
  if (weeks.length > 0) {
      fs.writeFileSync(path.join(publicDir, 'notes.json'), JSON.stringify({ weeks }, null, 2));
      console.log('✅ Generated notes.json dynamically!');
  }
}
