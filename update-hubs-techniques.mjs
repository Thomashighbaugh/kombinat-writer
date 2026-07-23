import fs from 'fs';
import path from 'path';

const files = [
  'src/tools/hubs/kombinat/outline.ts',
  'src/tools/hubs/kombinat/draft.ts',
  'src/tools/hubs/kombinat/revise.ts',
  'src/tools/hubs/kombinat/critique.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replacements
  content = content.replace(/namecraft/g, 'nomenclature-design');
  content = content.replace(/scene-structure/g, 'scene-architecture');
  content = content.replace(/emotional-interiority/g, 'psychological-interiority');

  fs.writeFileSync(file, content, 'utf-8');
}
