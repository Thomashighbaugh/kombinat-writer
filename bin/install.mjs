#!/usr/bin/env node
/**
 * Kombinat Writer — Per-Project Installer (OpenCode only)
 *
 * Installs the kombinat-writer workflow into a book project's .opencode/ directory.
 * Copies skills, tools, lib, templates, slash commands, and the built TUI sidebar plugin.
 * Writes opencode.jsonc to register the plugin so the /kombinat instant menu loads.
 */
import { confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Paths ──────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PACKAGE_ROOT, 'src');
const DEST_DIR = path.join(process.cwd(), '.opencode');

// ─── Logging ────────────────────────────────────────────────────────────────
function log(msg) { console.log(chalk.white(msg)); }
function success(msg) { console.log(chalk.green(`  \u2713 ${msg}`)); }
function warn(msg) { console.log(chalk.yellow(`  \u26A0 ${msg}`)); }
function error(msg) { console.log(chalk.red(`  \u2717 ${msg}`)); }
function header(msg) {
    console.log(chalk.cyan.bold(`\n${msg}`));
    console.log(chalk.cyan('\u2500'.repeat(Math.min(msg.length, 60))));
}

// ─── Conflict Resolution ───────────────────────────────────────────────────
async function resolveConflict(destPath) {
    if (!fs.existsSync(destPath)) return 'copy';
    return await select({
        message: `Conflict: ${path.basename(destPath)} already exists. What should I do?`,
        choices: [
            { name: 'Overwrite', value: 'overwrite' },
            { name: 'Skip', value: 'skip' },
            { name: 'Overwrite all remaining', value: 'overwrite-all' },
            { name: 'Skip all remaining', value: 'skip-all' },
        ],
    });
}

// ─── Skills ─────────────────────────────────────────────────────────────────
async function copySkills(track, overwriteAll, skipAll) {
    const destDir = path.join(DEST_DIR, 'skills');
    const baseSkillDirs = ['quality-assurance', 'critique', 'research'];
    const trackSkillDirs = {
        fiction: ['fiction/writing-techniques', 'fiction/genre-knowledge'],
        'non-fiction': ['non-fiction/academic-writing', 'non-fiction/citation-styles', 'non-fiction/argument-structure', 'non-fiction/source-evaluation', 'non-fiction'],
        mixed: ['fiction/writing-techniques', 'fiction/genre-knowledge', 'non-fiction/citation-styles', 'non-fiction/source-evaluation', 'non-fiction'],
    };
    const allDirs = [...baseSkillDirs, ...trackSkillDirs[track]];
    fs.ensureDirSync(destDir);
    let copied = 0, skipped = 0, newOverwriteAll = overwriteAll, newSkipAll = skipAll;
    for (const skillDir of allDirs) {
        const src = path.join(SRC_DIR, 'skills', skillDir);
        const dest = path.join(destDir, skillDir);
        if (!fs.existsSync(src)) { warn(`Skill directory not found: ${skillDir}`); continue; }
        if (newSkipAll) { skipped++; continue; }
        if (fs.existsSync(dest) && !newOverwriteAll) {
            const action = await resolveConflict(dest);
            if (action === 'skip') { skipped++; continue; }
            if (action === 'skip-all') { newSkipAll = true; skipped++; continue; }
            if (action === 'overwrite-all') newOverwriteAll = true;
        }
        fs.copySync(src, dest, { overwrite: true });
        copied++;
    }
    success(`${copied} skill directories copied${skipped > 0 ? `, ${skipped} skipped` : ''}`);
    return { overwriteAll: newOverwriteAll, skipAll: newSkipAll, copied, skipped };
}

// ─── Tools + Lib ────────────────────────────────────────────────────────────
async function copyToolsAndLib(overwriteAll, skipAll) {
    const srcTools = path.join(SRC_DIR, 'tools');
    const destTools = path.join(DEST_DIR, 'tools');
    if (!fs.existsSync(srcTools)) return { overwriteAll, skipAll, copied: 0, skipped: 0 };
    fs.ensureDirSync(destTools);
    let copied = 0, skipped = 0, newOverwriteAll = overwriteAll, newSkipAll = skipAll;
    async function walkDir(dir, relativePath = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === 'installer.ts' || entry.name === 'install.mjs') { skipped++; continue; }
            const srcPath = path.join(dir, entry.name);
            const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
            const destPath = path.join(destTools, relPath);
            if (entry.isDirectory()) {
                fs.ensureDirSync(destPath);
                await walkDir(srcPath, relPath);
                copied++;
            } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.mjs')) {
                if (newSkipAll) { skipped++; continue; }
                if (fs.existsSync(destPath) && !newOverwriteAll) {
                    if (relativePath) { skipped++; continue; }
                    const action = await resolveConflict(destPath);
                    if (action === 'skip') { skipped++; continue; }
                    if (action === 'skip-all') { newSkipAll = true; skipped++; continue; }
                    if (action === 'overwrite-all') newOverwriteAll = true;
                }
                fs.copySync(srcPath, destPath, { overwrite: true });
                copied++;
            }
        }
    }
    await walkDir(srcTools);
    // Copy lib/
    const srcLib = path.join(SRC_DIR, 'lib');
    if (fs.existsSync(srcLib)) {
        const libDest = path.join(destTools, 'lib');
        fs.ensureDirSync(libDest);
        for (const file of fs.readdirSync(srcLib).filter(f => f.endsWith('.ts'))) {
            const srcFile = path.join(srcLib, file);
            const destFile = path.join(libDest, file);
            if (newSkipAll) { skipped++; continue; }
            if (fs.existsSync(destFile) && !newOverwriteAll) { skipped++; continue; }
            fs.copySync(srcFile, destFile, { overwrite: true });
            copied++;
        }
    }
    success(`${copied} tools/lib files copied`);
    return { overwriteAll: newOverwriteAll, skipAll: newSkipAll, copied, skipped };
}

// ─── Slash Commands ─────────────────────────────────────────────────────────
async function copySlashCommands(overwriteAll, skipAll) {
    const srcDir = path.join(SRC_DIR, 'commands');
    const destDir = path.join(DEST_DIR, 'commands');
    if (!fs.existsSync(srcDir)) { warn('Slash commands source not found — skipping'); return { overwriteAll, skipAll, copied: 0, skipped: 0 }; }
    fs.ensureDirSync(destDir);
    let copied = 0, skipped = 0, newOverwriteAll = overwriteAll, newSkipAll = skipAll;
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
        const src = path.join(srcDir, file);
        const dest = path.join(destDir, file);
        if (newSkipAll) { skipped++; continue; }
        if (fs.existsSync(dest) && !newOverwriteAll) {
            const action = await resolveConflict(dest);
            if (action === 'skip') { skipped++; continue; }
            if (action === 'skip-all') { newSkipAll = true; skipped++; continue; }
            if (action === 'overwrite-all') newOverwriteAll = true;
        }
        fs.copySync(src, dest, { overwrite: true });
        copied++;
    }
    success(`${copied} slash commands copied`);
    return { overwriteAll: newOverwriteAll, skipAll: newSkipAll, copied, skipped };
}

// ─── Templates ──────────────────────────────────────────────────────────────
function copyTemplates(track) {
    const baseTemplates = path.join(SRC_DIR, 'templates');
    const destDir = path.join(DEST_DIR, 'templates');
    if (!fs.existsSync(baseTemplates)) { log('No templates to install'); return; }
    fs.ensureDirSync(destDir);
    const baseDir = path.join(baseTemplates, 'base');
    if (fs.existsSync(baseDir)) fs.copySync(baseDir, destDir, { overwrite: true });
    const trackDir = path.join(baseTemplates, track);
    if (fs.existsSync(trackDir)) fs.copySync(trackDir, destDir, { overwrite: true });
    // Copy series templates
    const seriesDir = path.join(baseTemplates, 'series');
    if (fs.existsSync(seriesDir)) {
        const destSeriesDir = path.join(destDir, 'series');
        fs.copySync(seriesDir, destSeriesDir, { overwrite: true });
    }
    success('Templates copied');
}

// ─── Sidebar Plugin (built bundle) ──────────────────────────────────────────
async function copySidebarPlugin(overwriteAll, skipAll) {
    // Prefer the pre-built bundle in dist/plugins/kombinat-sidebar/.
    // Fall back to source .tsx if no build exists (dev mode).
    const builtDir = path.join(PACKAGE_ROOT, 'dist', 'plugins', 'kombinat-sidebar');
    const destDir = path.join(DEST_DIR, 'plugins', 'kombinat-sidebar');

    if (fs.existsSync(builtDir)) {
        fs.ensureDirSync(destDir);
        let copied = 0;
        for (const file of fs.readdirSync(builtDir)) {
            fs.copySync(path.join(builtDir, file), path.join(destDir, file), { overwrite: true });
            copied++;
        }
        success(`${copied} built sidebar plugin files copied → .opencode/plugins/kombinat-sidebar/`);
        return { overwriteAll, skipAll, copied };
    }

    // Dev fallback — copy raw .tsx source (OpenCode can load .tsx directly when TS is available)
    const srcDir = path.join(SRC_DIR, 'plugins');
    if (!fs.existsSync(srcDir)) { log('No sidebar plugin source — skipping'); return { overwriteAll, skipAll, copied: 0 }; }
    fs.ensureDirSync(destDir);
    let copied = 0, newOverwriteAll = overwriteAll, newSkipAll = skipAll;
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const src = path.join(srcDir, entry.name);
        const dest = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            fs.copySync(src, dest, { overwrite: true });
            copied += fs.readdirSync(src).length;
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name === 'package.json' || entry.name === 'tsconfig.json') {
            if (newSkipAll) continue;
            if (fs.existsSync(dest) && !newOverwriteAll) {
                const action = await resolveConflict(dest);
                if (action === 'skip' || action === 'skip-all') {
                    if (action === 'skip-all') newSkipAll = true;
                    continue;
                }
                if (action === 'overwrite-all') newOverwriteAll = true;
            }
            fs.copySync(src, dest, { overwrite: true });
            copied++;
        }
    }
    warn('No pre-built plugin found — copied raw .tsx source. Run `npm run build:sidebar` in kombinat-writer for production installs.');
    success(`${copied} sidebar plugin source files copied`);
    return { overwriteAll: newOverwriteAll, skipAll: newSkipAll, copied };
}

// ─── Project tui.json + package.json (TUI plugin registration) ──────────────
// OpenCode loads TUI plugins from tui.json, NOT from opencode.jsonc's plugin
// array (that array is for server plugins that export { server() }).
// tui.json is loaded from the global config dir AND per-project .opencode/
// directories. We write .opencode/tui.json so the plugin is scoped to the
// book project.
//
// The plugin's built bundle externalizes solid-js and @opentui/solid (they
// are baked into the OpenCode bun runtime but need to be resolvable from
// .opencode/node_modules/). OpenCode runs `bun install` on .opencode/package.json
// at startup, so we ensure the runtime deps are declared there.
async function ensureProjectConfig() {
    const projectRoot = process.cwd();
    const tuiJsonPath = path.join(DEST_DIR, 'tui.json');
    const pkgJsonPath = path.join(DEST_DIR, 'package.json');
    const PLUGIN_ENTRY = './plugins/kombinat-sidebar/index.js';

    // ── tui.json: register the plugin ──
    if (!fs.existsSync(tuiJsonPath)) {
        const config = {
            $schema: 'https://opencode.ai/tui.json',
            plugin: [PLUGIN_ENTRY],
        };
        fs.writeJsonSync(tuiJsonPath, config, { spaces: 2 });
        let content = fs.readFileSync(tuiJsonPath, 'utf-8');
        if (!content.endsWith('\n')) { fs.writeFileSync(tuiJsonPath, content + '\n'); }
        success('Created .opencode/tui.json with kombinat-sidebar plugin registered');
    } else {
        const raw = fs.readFileSync(tuiJsonPath, 'utf-8');
        let config;
        try {
            config = JSON.parse(raw);
        } catch {
            const stripped = raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
            try {
                config = JSON.parse(stripped);
            } catch {
                warn('Could not parse existing .opencode/tui.json — skipping plugin registration. Add this manually:');
                log(`  "plugin": ["${PLUGIN_ENTRY}"]`);
                config = null;
            }
        }
        if (config) {
            const plugins = Array.isArray(config.plugin) ? config.plugin : [];
            const hasEntry = plugins.some(p => typeof p === 'string' && p.endsWith('kombinat-sidebar/index.js'));
            if (hasEntry) {
                log('.opencode/tui.json already registers kombinat-sidebar — skipping');
            } else {
                config.plugin = [...plugins, PLUGIN_ENTRY];
                fs.writeFileSync(tuiJsonPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
                success(`Added kombinat-sidebar to .opencode/tui.json plugin array`);
            }
        }
    }

    // ── package.json: ensure runtime deps for the plugin ──
    // The plugin externalizes solid-js and @opentui/solid at build time.
    // OpenCode's bun runtime can resolve these from .opencode/node_modules/.
    // OpenCode runs `bun install` on .opencode/package.json at startup.
    const REQUIRED_DEPS = {
        '@opencode-ai/plugin': '1.17.9',
        '@opentui/solid': '>=0.1.97',
        'solid-js': '^1.9.0',
        'fs-extra': '^11.0.0',
    };

    let pkg = {};
    if (fs.existsSync(pkgJsonPath)) {
        try { pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')); } catch { pkg = {}; }
    }
    pkg.type = pkg.type || 'module';
    pkg.dependencies = pkg.dependencies || {};
    let depsAdded = false;
    for (const [name, version] of Object.entries(REQUIRED_DEPS)) {
        if (!pkg.dependencies[name]) {
            pkg.dependencies[name] = version;
            depsAdded = true;
        }
    }
    if (depsAdded) {
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        success('Updated .opencode/package.json with plugin runtime deps (solid-js, @opentui/solid, fs-extra)');
        log('  OpenCode will run `bun install` on next startup to install them');
    } else {
        log('.opencode/package.json already has all required deps — skipping');
    }
}

// ─── Project Init ───────────────────────────────────────────────────────────
async function initProjectStructure(track) {
    const projectRoot = process.cwd();
    const bookDir = path.join(projectRoot, 'book');
    if (fs.existsSync(bookDir)) {
        const update = await confirm({ message: 'book/ directory already exists. Update track.json?', default: false });
        if (update) fs.writeJsonSync(path.join(bookDir, 'track.json'), { track, initialized: new Date().toISOString(), version: '0.1.0' }, { spaces: 2 });
    } else {
        fs.ensureDirSync(bookDir);
        fs.ensureDirSync(path.join(bookDir, 'content'));
        fs.ensureDirSync(path.join(bookDir, 'research', 'sources'));
        fs.ensureDirSync(path.join(bookDir, 'research', 'bibliography'));
        fs.ensureDirSync(path.join(bookDir, 'research', 'interviews'));
        fs.ensureDirSync(path.join(bookDir, 'knowledge'));
        fs.ensureDirSync(path.join(bookDir, 'tracking'));
        fs.ensureDirSync(path.join(bookDir, 'drafts'));
        fs.ensureDirSync(path.join(bookDir, 'critique'));
        fs.ensureDirSync(path.join(bookDir, 'revisions'));
        fs.ensureDirSync(path.join(bookDir, 'style-sheet'));
        fs.ensureDirSync(path.join(bookDir, 'checkpoints'));
        fs.ensureDirSync(path.join(projectRoot, 'memory'));
        fs.ensureDirSync(path.join(projectRoot, 'output', 'manuscript'));
        fs.writeJsonSync(path.join(bookDir, 'track.json'), { track, initialized: new Date().toISOString(), version: '0.1.0' }, { spaces: 2 });
        const constitutionPath = path.join(bookDir, 'constitution.md');
        if (!fs.existsSync(constitutionPath)) {
            fs.writeFileSync(constitutionPath, `# ${track === 'fiction' ? 'Creative' : 'Intellectual'} Constitution\n\n*Generated by Kombinat Writer — replace with your principles.*\n\n## Core Values\n[Your central thesis, theme, or purpose]\n\n## Quality Baseline\n[Your non-negotiable standards]\n\n## Style Principles\n[Register, tone, conventions]\n\n## Content Principles\n[Structure, evidence, narrative norms]\n\n## Reader Contract\n[Audience expectations, content notes]\n\n## Revision Procedures\n[How revision decisions are made]\n`, 'utf-8');
        }
        success('Project structure initialized');
    }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log(chalk.white('\nKombinat Writer — Professional Book Writing Workflow'));
    console.log(chalk.gray('Installs the /kombinat writing workflow into .opencode/\n'));

    const track = await select({
        message: 'Which track do you want to use for this project?',
        choices: [
            { name: 'Fiction', value: 'fiction', description: 'Novels, short stories, serials, creative non-fiction' },
            { name: 'Non-Fiction', value: 'non-fiction', description: 'Academic works, journalism, biography, technical books' },
            { name: 'Mixed', value: 'mixed', description: 'Creative non-fiction, memoir with research, narrative journalism' },
        ],
    });

    // ── Lorebook / Premise import option ──
    const importChoice = await select({
        message: 'Do you have a lorebook, premise, or world-building document to import?',
        choices: [
            { name: 'No', value: 'none', description: 'Start from scratch' },
            { name: 'Yes — Lorebook (SillyTavern/JanitorAI/CharacterAI JSON)', value: 'lorebook', description: 'Import a world info / character card export' },
            { name: 'Yes — Premise document (Markdown, text, outline)', value: 'premise', description: 'Import a written premise, synopsis, or idea file' },
        ],
    });

    let importedFiles = [];
    if (importChoice !== 'none') {
        const { input } = await import('@inquirer/prompts');
        const rawInput = await input({
            message: importChoice === 'lorebook'
                ? 'Path to your lorebook JSON file(s) (space-separated for multiple):'
                : 'Path to your premise/idea document(s) (space-separated for multiple):',
            default: '',
        });
        // Split on spaces, strip quotes, resolve ~ and relative paths
        const paths = rawInput
            .split(/\s+/)
            .map(p => p.replace(/^["']|["']$/g, '').trim())
            .filter(p => p.length > 0)
            .map(p => {
                if (p.startsWith('~/')) return path.join(process.env.HOME, p.slice(2));
                if (!path.isAbsolute(p)) return path.resolve(p);
                return p;
            });

        for (const p of paths) {
            if (fs.existsSync(p)) {
                const basename = path.basename(p);
                let destPath;
                if (importChoice === 'lorebook') {
                    // Multiple lorebooks get numbered suffixes
                    destPath = path.join(process.cwd(), `imported-lorebook-${importedFiles.length === 0 ? basename : basename}`);
                    if (importedFiles.length > 0 && basename === path.basename(importedFiles[0])) {
                        destPath = path.join(process.cwd(), `imported-lorebook-${importedFiles.length}.json`);
                    }
                    destPath = path.join(process.cwd(), importedFiles.length === 0 ? 'imported-lorebook.json' : `imported-lorebook-${importedFiles.length}.json`);
                } else {
                    destPath = path.join(process.cwd(), importedFiles.length === 0 ? 'premise.md' : `premise-${importedFiles.length}.md`);
                }
                fs.copySync(p, destPath);
                success(`Imported → ${path.basename(destPath)}`);
                importedFiles.push(destPath);
            } else {
                warn(`File not found: "${p}" — skipping`);
            }
        }
        if (importedFiles.length === 0 && rawInput.trim()) {
            warn('No files could be imported — you can add them later via /kombinat constitute');
        }
    }

    header('Project Structure');
    await initProjectStructure(track);

    header('Installing Workflow');
    let overwriteAll = false, skipAll = false;

    const skillResult = await copySkills(track, overwriteAll, skipAll);
    overwriteAll = skillResult.overwriteAll; skipAll = skillResult.skipAll;

    const toolResult = await copyToolsAndLib(overwriteAll, skipAll);
    overwriteAll = toolResult.overwriteAll; skipAll = toolResult.skipAll;

    const cmdResult = await copySlashCommands(overwriteAll, skipAll);
    overwriteAll = cmdResult.overwriteAll; skipAll = cmdResult.skipAll;

    copyTemplates(track);

    const pluginResult = await copySidebarPlugin(overwriteAll, skipAll);
    overwriteAll = pluginResult.overwriteAll; skipAll = pluginResult.skipAll;

    header('Registering Plugin');
    await ensureProjectConfig();

    header('Installation Complete');
    log('');
    log('  Installed to .opencode/:');
    log(`    ${chalk.green('\u2713')} skills/`);
    log(`    ${chalk.green('\u2713')} tools/ (incl. hubs/kombinat/ + lib/)`);
    log(`    ${chalk.green('\u2713')} commands/kombinat.md`);
    log(`    ${chalk.green('\u2713')} templates/`);
    log(`    ${chalk.green('\u2713')} plugins/kombinat-sidebar/ (built bundle)`);
    log('');
    log(`  ${chalk.green('\u2713')} tui.json — TUI plugin registered`);
    log(`  ${chalk.green('\u2713')} package.json — runtime deps (solid-js, @opentui/solid, fs-extra)`);
    log('');
    log('  Next steps:');
    log('    1. Open your project in OpenCode (restart if already open)');
    log('    2. Type /kombinat to open the instant phase menu');
    if (importedFiles.length > 0) {
        log(`    3. Run /kombinat constitute — it will detect your imported ${importChoice === 'lorebook' ? 'lorebook' : 'premise'} file${importedFiles.length > 1 ? 's' : ''} and use it`);
    } else {
        log('    3. Or invoke a specific phase directly (e.g. /kombinat outline)');
    }
    log('');
    log('  Phases: guided, constitute, specify, clarify, research, outline,');
    log('          task-manager, draft, critique, revise, edit, review,');
    log('          cite, publish, track, timeline, meta, drafter,');
    log('          verify, resume, cycle, pacing-audit, hook-review,');
    log('          read-through, series');
    log('');
}

main().catch(err => { error(err.message); process.exit(1); });