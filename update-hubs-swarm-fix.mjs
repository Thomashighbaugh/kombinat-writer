import fs from 'fs';
import path from 'path';

const critiquePath = 'src/tools/hubs/kombinat/critique.ts';
let content = fs.readFileSync(critiquePath, 'utf-8');

// 1. Add 'task' tool
if (!content.includes('"task"')) {
  content = content.replace(/tools: \["loadSkill", "bash"\],/, 'tools: ["loadSkill", "bash", "task"],');
}

// 2. Add 'swarm-orchestrator' and 'hook-and-transition-analyst' to relatedSkills
if (!content.includes('"swarm-orchestrator"')) {
  content = content.replace(/relatedSkills: \[\s*"developmental-editor"/, 'relatedSkills: ["swarm-orchestrator", "hook-and-transition-analyst", "developmental-editor"');
}

// 3. Add 'swarm' mode to documentation
if (!content.includes('| \\`swarm\\` |')) {
  content = content.replace(/\| \\`personas\\` \|.*?\|/m, "$&\n| \\`swarm\\` | Multi-Agent Pipeline | Parallel dispatch of 4 subagents (Structure, Prose, Continuity, Hooks) for deep analysis | High-value chapters, major revisions |");
}

// 4. Update the detailedDescription text for modes
content = content.replace(/Modes: developmental, audience, domain, cultural, comprehensive\./, 'Modes: developmental, audience, domain, cultural, comprehensive, swarm.');

// 5. Add Swarm execution block
if (!content.includes('### 4d. Swarm Mode Execution')) {
  const swarmBlock = "### 4d. Swarm Mode Execution\n\nWhen mode is \\`swarm\\`, execute the **Three-Phase Multi-Agent Swarm** pattern:\n1. **Parallel Dispatch**: Use the \\`task\\` tool to launch four subagents concurrently:\n   - \\`@deep-thinker\\` loaded with \\`developmental-editor\\` (Structural Analyst)\n   - \\`@code-reviewer\\` loaded with \\`line-editor\\` (Prose Reviewer)\n   - \\`@refactoring\\` loaded with \\`continuity-auditor\\` (Continuity Auditor)\n   - \\`@deep-thinker\\` loaded with \\`hook-and-transition-analyst\\` (Momentum Analyst)\n2. **Consolidation**: Reconcile their reports, removing duplicates and formatting into the master Priority Matrix.\n3. **Verification**: Confirm no hallucinations or violations of project metadata before saving.\n\n### 5. Build Priority Matrix";
  content = content.replace(/### 5. Build Priority Matrix/m, swarmBlock);
}

fs.writeFileSync(critiquePath, content, 'utf-8');
