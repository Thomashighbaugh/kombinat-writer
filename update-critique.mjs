import fs from 'fs';
import path from 'path';

const files = [
  'src/tools/hubs/kombinat/critique.ts',
  'src/tools/hubs/kombinat/cycle.ts',
  'src/tools/hubs/kombinat/guided.ts',
  'src/tools/hubs/kombinat/read-through.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replacements
  content = content.replace(/alpha-reader/g, 'developmental-editor');
  content = content.replace(/beta-reader/g, 'audience-surrogate');
  
  // Specific replacements for critique modes
  if (file.includes('critique.ts')) {
    content = content.replace(/Modes: alpha, beta/g, 'Modes: developmental, audience');
    content = content.replace(/critique alpha/g, 'critique developmental');
    content = content.replace(/`alpha`/g, '`developmental`');
    content = content.replace(/`beta`/g, '`audience`');
    content = content.replace(/alpha \+ beta/g, 'developmental + audience');
    content = content.replace(/→ alpha/g, '→ developmental');
    content = content.replace(/alpha mode/g, 'developmental mode');
    content = content.replace(/A = alpha mode/g, 'D = developmental mode');
    content = content.replace(/C1-A-001/g, 'C1-D-001');
    content = content.replace(/\[alpha\/beta\//g, '[developmental/audience/');
    content = content.replace(/Alpha \| Structure/g, 'Developmental | Structure');
    content = content.replace(/Beta \| Engagement/g, 'Audience | Engagement');
  }

  if (file.includes('guided.ts')) {
    content = content.replace(/`alpha`, `beta`/g, '`developmental`, `audience`');
  }

  fs.writeFileSync(file, content, 'utf-8');
}
