import fs from 'fs';
import path from 'path';

const hubsDir = 'src/tools/hubs/kombinat';
const filesToUpdate = ['outline.ts', 'draft.ts', 'critique.ts', 'revise.ts', 'specify.ts', 'edit.ts', 'manifest.ts'];
const ruleStr = `"Whenever the user makes a decision that alters narrative context, metanarrative, formatting, or tracking states, you MUST proactively update the relevant files in ./book/metadata/ and ./book/tracking/ before completing the turn."`;

for (const file of filesToUpdate) {
  const filePath = path.join(hubsDir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('rules: [')) continue;

  if (content.includes('tools: [')) {
    content = content.replace(/tools:\s*\[/, `rules: [\n    ${ruleStr}\n  ],\n  tools: [`);
  } else if (content.includes('warnings: [')) {
    content = content.replace(/warnings:\s*\[/, `rules: [\n    ${ruleStr}\n  ],\n  warnings: [`);
  } else {
    console.log(`Could not find anchor in ${file}`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}
