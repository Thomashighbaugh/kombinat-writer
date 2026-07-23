import fs from 'fs';
import path from 'path';

const files = [
  'src/tools/hubs/kombinat/critique.ts',
  'src/tools/hubs/kombinat/cycle.ts',
  'src/tools/hubs/kombinat/read-through.ts',
  'src/tools/hubs/kombinat/review.ts',
  'src/tools/hubs/kombinat/verify.ts',
  'src/tools/hubs/kombinat/revise.ts',
  'src/tools/hubs/kombinat/edit.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replacements
  content = content.replace(/peer-review/g, 'domain-expert');
  content = content.replace(/sensitivity-reader/g, 'cultural-consultant');
  content = content.replace(/prose-polishing-check/g, 'line-editor');
  content = content.replace(/consistency-checker/g, 'continuity-auditor');
  
  if (file.includes('critique.ts')) {
    content = content.replace(/Modes: developmental, audience, peer, sensitivity/g, 'Modes: developmental, audience, domain, cultural');
    content = content.replace(/critique peer/g, 'critique domain');
    content = content.replace(/`peer`/g, '`domain`');
    content = content.replace(/`sensitivity`/g, '`cultural`');
    content = content.replace(/developmental \+ audience \+ sensitivity \+ peer/g, 'developmental + audience + cultural + domain');
    content = content.replace(/→ peer/g, '→ domain');
    content = content.replace(/peer mode/g, 'domain mode');
    content = content.replace(/\[developmental\/audience\/peer\/sensitivity/g, '[developmental/audience/domain/cultural');
  }

  fs.writeFileSync(file, content, 'utf-8');
}
