#!/usr/bin/env node
/**
 * Kombinat Writer — Per-Project Installer (OpenCode only)
 *
 * Installs the kombinat-writer workflow into a book project's .opencode/ directory.
 * Copies skills, tools, lib, templates, slash commands, and the built TUI sidebar plugin.
 * Writes opencode.jsonc to register the plugin so the /kombinat instant menu loads.
 *
 * Usage:
 *   npx kombinat-writer                  # interactive (default)
 *   npx kombinat-writer --non-interactive # for postinstall / CI; uses defaults
 *   npx kombinat-writer --reset          # if a prior install exists, ask to start over
 *   npx kombinat-writer --force-reset    # same as --reset but skip the modified-locally check
 *
 * For idempotent in-place updates of an existing install, prefer:
 *   npx kombinat-refresh
 */
import { confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

import {
    copySkills as syncCopySkills,
    copyToolsAndLib as syncCopyToolsAndLib,
    copySlashCommands as syncCopySlashCommands,
    copyTemplates as syncCopyTemplates,
    copySidebarPlugin as syncCopySidebarPlugin,
    ensureProjectConfig as syncEnsureProjectConfig,
    initProjectStructure as syncInitProjectStructure,
    PACKAGE_ROOT as PKG_ROOT,
} from './lib/sync.mjs';
import {
    loadManifest,
    writeManifest,
    buildManifest,
} from './lib/manifest.mjs';
import { isPluginOwned } from './lib/plugin-tree.mjs';

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

// ─── Per-project acknowledgement blurb ─────────────────────────────────────
/**
 * Print the per-project install acknowledgement. The user is asked to confirm
 * they understand the plugin will be installed into THIS directory only and
 * will not modify global state.
 */
async function printPerProjectAck() {
    console.log(chalk.white('\nKombinat Writer — per-project install'));
    console.log(chalk.white('─'.repeat(60)));
    console.log(chalk.white('This installer will copy the kombinat-writer plugin into THIS'));
    console.log(chalk.white("directory's .opencode/ folder. It will:"));
    console.log('');
    console.log(chalk.white('  • Copy skills, tools, templates, slash commands, and the TUI plugin'));
    console.log(chalk.white('  • Create .opencode/opencode.jsonc, tui.json, and package.json'));
    console.log(chalk.white('    (registering kombinat-sidebar as a project-local plugin)'));
    console.log(chalk.white('  • Install the npm deps kombinat-writer needs to run'));
    console.log(chalk.white('  • Create ./book, ./memory, ./output/manuscript if they don\'t exist'));
    console.log('');
    console.log(chalk.white('It will NOT:'));
    console.log('');
    console.log(chalk.white('  • Touch any files outside this directory'));
    console.log(chalk.white('  • Modify your global opencode.json, ~/.config/opencode, or'));
    console.log(chalk.white('    your global node_modules'));
    console.log(chalk.white('  • Touch existing book/, memory/, or output/ contents'));
    console.log('');
    console.log(chalk.white('Lore retrieval, when enabled, uses LOCAL Ollama models'));
    console.log(chalk.white('(pedrohml/mxbai-embed-large, hans-tech/bge-reranker-v2-m3). No'));
    console.log(chalk.white('network calls. No telemetry. Pull the models with:'));
    console.log('');
    console.log(chalk.cyan('    ollama pull pedrohml/mxbai-embed-large:latest'));
    console.log(chalk.cyan('    ollama pull hans-tech/bge-reranker-v2-m3:260522'));
    console.log('');
    console.log(chalk.white('After install, use kombinat-refresh to sync updates without'));
    console.log(chalk.white('overwriting your project work.'));
    console.log('');
    const ok = await confirm({ message: 'Acknowledge and continue?', default: true });
    if (!ok) {
        console.log(chalk.yellow('Aborted.'));
        process.exit(0);
    }
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
        
        // Idempotent sync: always overwrite core workflow assets
        fs.copySync(src, dest, { overwrite: true });
        copied++;
    }
    success(`${copied} skill directories synchronized`);
    return { overwriteAll: true, skipAll: false, copied, skipped: 0 };
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
    // Copy lib/ (TypeScript modules + scripts/)
    const srcLib = path.join(SRC_DIR, 'lib');
    if (fs.existsSync(srcLib)) {
        const libDest = path.join(destTools, 'lib');
        fs.ensureDirSync(libDest);
        // Copy .ts modules
        for (const file of fs.readdirSync(srcLib).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'))) {
            const srcFile = path.join(srcLib, file);
            const destFile = path.join(libDest, file);
            if (newSkipAll) { skipped++; continue; }
            if (fs.existsSync(destFile) && !newOverwriteAll) { skipped++; continue; }
            fs.copySync(srcFile, destFile, { overwrite: true });
            copied++;
        }
        // Copy scripts/ directory (lore-query.mjs etc.)
        const srcScripts = path.join(srcLib, 'scripts');
        if (fs.existsSync(srcScripts)) {
            const destScripts = path.join(libDest, 'scripts');
            fs.ensureDirSync(destScripts);
            for (const file of fs.readdirSync(srcScripts)) {
                const srcFile = path.join(srcScripts, file);
                const destFile = path.join(destScripts, file);
                if (newSkipAll) { skipped++; continue; }
                if (fs.existsSync(destFile) && !newOverwriteAll) { skipped++; continue; }
                fs.copySync(srcFile, destFile, { overwrite: true });
                copied++;
            }
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
        
        // Idempotent sync: always overwrite core workflow assets
        fs.copySync(src, dest, { overwrite: true });
        copied++;
    }
    success(`${copied} slash commands synchronized`);
    return { overwriteAll: true, skipAll: false, copied, skipped: 0 };
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
        success(`${copied} built sidebar plugin files synchronized`);
        return { overwriteAll: true, skipAll: false, copied };
    }

    // Dev fallback
    const srcDir = path.join(SRC_DIR, 'plugins');
    if (!fs.existsSync(srcDir)) { log('No sidebar plugin source — skipping'); return { overwriteAll: true, skipAll: false, copied: 0 }; }
    fs.ensureDirSync(destDir);
    let copied = 0;
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const src = path.join(srcDir, entry.name);
        const dest = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            fs.copySync(src, dest, { overwrite: true });
            copied += fs.readdirSync(src).length;
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name === 'package.json' || entry.name === 'tsconfig.json') {
            fs.copySync(src, dest, { overwrite: true });
            copied++;
        }
    }
    warn('No pre-built plugin found — copied raw .tsx source.');
    success(`${copied} sidebar plugin source files synchronized`);
    return { overwriteAll: true, skipAll: false, copied };
}

// ─── Project tui.json + opencode.jsonc + package.json (plugin registration) ─
// OpenCode requires the plugin to be registered in BOTH:
//   1. .opencode/tui.json  — TUI keybind/theme config + TUI plugin paths
//   2. .opencode/opencode.jsonc — main config whose "plugin" array loads plugins
//
// tui.json alone is NOT sufficient — the plugin won't appear in `opencode debug
// info` and won't load. Both files must list the plugin path.
//
// The plugin's built bundle externalizes solid-js and @opentui/solid (they
// are baked into the OpenCode bun runtime but need to be resolvable from
// .opencode/node_modules/). OpenCode runs `bun install` on .opencode/package.json
// at startup, so we ensure the runtime deps are declared there.
async function ensureProjectConfig() {
    const projectRoot = process.cwd();
    const tuiJsonPath = path.join(DEST_DIR, 'tui.json');
    const opencodeJsoncPath = path.join(DEST_DIR, 'opencode.jsonc');
    const pkgJsonPath = path.join(DEST_DIR, 'package.json');
    const PLUGIN_ENTRY = path.resolve(DEST_DIR, 'plugins/kombinat-sidebar/index.js');

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
                warn('Could not parse existing .opencode/tui.json — skipping plugin registration.');
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

    // ── opencode.jsonc: register the plugin so it actually loads ──
    if (!fs.existsSync(opencodeJsoncPath)) {
        const config = {
            plugin: [PLUGIN_ENTRY],
        };
        fs.writeFileSync(opencodeJsoncPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
        success('Created .opencode/opencode.jsonc with kombinat-sidebar plugin registered');
    } else {
        const raw = fs.readFileSync(opencodeJsoncPath, 'utf-8');
        let config;
        try {
            const stripped = raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
            config = JSON.parse(stripped);
        } catch {
            warn('Could not parse existing .opencode/opencode.jsonc — skipping plugin registration.');
            config = null;
        }
        if (config) {
            const plugins = Array.isArray(config.plugin) ? config.plugin : [];
            const hasEntry = plugins.some(p => typeof p === 'string' && p.endsWith('kombinat-sidebar/index.js'));
            if (hasEntry) {
                log('.opencode/opencode.jsonc already registers kombinat-sidebar — skipping');
            } else {
                config.plugin = [...plugins, PLUGIN_ENTRY];
                fs.writeFileSync(opencodeJsoncPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
                success(`Added kombinat-sidebar to .opencode/opencode.jsonc plugin array`);
            }
        }
    }

    // ── package.json: ensure runtime deps for the plugin ──
    const REQUIRED_DEPS = {
        '@opencode-ai/plugin': '1.17.9',
        '@opentui/core': '>=0.1.97',
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
        success('Updated .opencode/package.json with plugin runtime deps');
        
        // --- ADDED: Install dependencies immediately ---
        const pkgManager = fs.existsSync(path.join(process.cwd(), 'bun.lockb')) ? 'bun' : 'npm';
        log(`  Installing dependencies with ${pkgManager}...`);
        try {
            execSync(`${pkgManager} install`, { cwd: DEST_DIR, stdio: 'inherit' });
            success('Dependencies installed successfully.');
        } catch (err) {
            error(`Failed to install dependencies: ${err.message}`);
        }
    } else {
        log('.opencode/package.json already has all required deps — skipping dependency install');
    }
}

// ─── Project Init ───────────────────────────────────────────────────────────
async function instantiateTemplates(targetDir, track) {
    const destTemplates = path.join(DEST_DIR, 'templates');
    
    // Fallback to SRC_DIR if DEST_DIR/templates isn't populated yet
    const sourceBase = fs.existsSync(destTemplates) ? destTemplates : path.join(SRC_DIR, 'templates');
    
    const dirsToCopy = [
        path.join(sourceBase, 'base'),
        path.join(sourceBase, track)
    ];

    for (const src of dirsToCopy) {
        if (!fs.existsSync(src)) continue;
        
        function copyRecursive(currentSrc, currentTarget) {
            fs.ensureDirSync(currentTarget);
            const entries = fs.readdirSync(currentSrc, { withFileTypes: true });
            for (const entry of entries) {
                const srcPath = path.join(currentSrc, entry.name);
                const destPath = path.join(currentTarget, entry.name);
                if (entry.isDirectory()) {
                    copyRecursive(srcPath, destPath);
                } else {
                    if (!fs.existsSync(destPath)) {
                        fs.ensureDirSync(path.dirname(destPath));
                        fs.copySync(srcPath, destPath);
                    }
                }
            }
        }
        copyRecursive(src, targetDir);
    }
}

async function initProjectStructure(track, nonInteractive = false, targetDir = path.join(process.cwd(), 'book')) {
    const projectRoot = process.cwd();
    if (fs.existsSync(targetDir)) {
        if (nonInteractive) {
            // Don't update track.json on a non-interactive reinstall; respect what's there.
            return;
        }
        const update = await confirm({ message: `${path.basename(targetDir)}/ directory already exists. Update track.json?`, default: false });
        if (update) fs.writeJsonSync(path.join(targetDir, 'track.json'), { track, initialized: new Date().toISOString(), version: '0.1.0' }, { spaces: 2 });
    } else {
        fs.ensureDirSync(targetDir);
        fs.ensureDirSync(path.join(targetDir, 'content'));
        fs.ensureDirSync(path.join(targetDir, 'research', 'sources'));
        fs.ensureDirSync(path.join(targetDir, 'research', 'bibliography'));
        fs.ensureDirSync(path.join(targetDir, 'research', 'interviews'));
        fs.ensureDirSync(path.join(targetDir, 'knowledge'));
        fs.ensureDirSync(path.join(targetDir, 'tracking'));
        fs.ensureDirSync(path.join(targetDir, 'drafts'));
        fs.ensureDirSync(path.join(targetDir, 'critique'));
        fs.ensureDirSync(path.join(targetDir, 'revisions'));
        fs.ensureDirSync(path.join(targetDir, 'metadata'));
        fs.ensureDirSync(path.join(targetDir, 'checkpoints'));
        fs.ensureDirSync(path.join(projectRoot, 'memory'));
        fs.ensureDirSync(path.join(projectRoot, 'output', 'manuscript'));
        
        fs.writeJsonSync(path.join(targetDir, 'track.json'), { track, initialized: new Date().toISOString(), version: '0.1.0' }, { spaces: 2 });
        
        await instantiateTemplates(targetDir, track);
        
        const manifestPath = path.join(targetDir, 'manifest.md');
        if (!fs.existsSync(manifestPath)) {
            fs.writeFileSync(manifestPath, `# ${track === 'fiction' ? 'Creative' : 'Intellectual'} Manifest\n\n*Generated by Kombinat Writer — replace with your principles.*\n\n## Core Values\n[Your central thesis, theme, or purpose]\n\n## Quality Baseline\n[Your non-negotiable standards]\n\n## Style Principles\n[Register, tone, conventions]\n\n## Content Principles\n[Structure, evidence, narrative norms]\n\n## Reader Contract\n[Audience expectations, content notes]\n\n## Revision Procedures\n[How revision decisions are made]\n`, 'utf-8');
        }
        success(`Project structure initialized at ${targetDir}`);
    }
}

// ─── Main ───────────────────────────────────────────────────────────────────
function parseInstallArgs(argv) {
    const args = {
        nonInteractive: false,
        reset: false,
        forceReset: false,
        postinstall: false,
        help: false,
    }
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i]
        if (a === '--non-interactive') args.nonInteractive = true
        else if (a === '--reset') args.reset = true
        else if (a === '--force-reset') args.forceReset = true
        else if (a === '--postinstall') { args.nonInteractive = true; args.postinstall = true }
        else if (a === '--help' || a === '-h') args.help = true
    }
    return args
}

async function main() {
    const args = parseInstallArgs(process.argv)
    if (args.help) {
        console.log(chalk.white('kombinat-writer — per-project installer'))
        console.log('')
        console.log('Usage:')
        console.log('  npx kombinat-writer [options]')
        console.log('')
        console.log('Options:')
        console.log('  --non-interactive    Use defaults; skip prompts (for postinstall/CI)')
        console.log('  --reset              Force a fresh install (overwrite everything)')
        console.log('  --force-reset        --reset + skip the modified-locally check')
        console.log('  --postinstall        Alias for --non-interactive (used by npm postinstall)')
        console.log('  --help, -h           Show this help')
        console.log('')
        console.log('For idempotent in-place updates, prefer: npx kombinat-refresh')
        process.exit(0)
    }

    // ── Redirect to refresh if a prior install exists ──
    const existingManifest = loadManifest(DEST_DIR)
    if (existingManifest && !args.reset && !args.forceReset) {
        if (args.nonInteractive || args.postinstall) {
            // postinstall on an already-installed project → just exit (refresh will be run separately)
            console.log(chalk.yellow('⚠ A prior kombinat-writer install is recorded in this project.'))
            console.log(chalk.yellow(`  Manifest: ${path.join(DEST_DIR, '.kombinat-install-manifest.json')}`))
            console.log(chalk.yellow('  Nothing to do. Use `npx kombinat-refresh` to sync updates.'))
            process.exit(0)
        }
        console.log(chalk.yellow('\n⚠ A prior kombinat-writer install is recorded in this project'))
        console.log(chalk.yellow(`  (commit ${existingManifest.packageCommit || 'unknown'}, last installed ${existingManifest.installedAt}).`))
        console.log(chalk.yellow(''))
        console.log(chalk.white('  For an idempotent refresh that preserves your work:'))
        console.log(chalk.cyan('      npx kombinat-refresh'))
        console.log(chalk.yellow(''))
        console.log(chalk.white('  To start over from scratch (DESTRUCTIVE — overwrites every'))
        console.log(chalk.white('  plugin-owned file; you will lose any local edits to phase'))
        console.log(chalk.white('  specs and slash commands):'))
        console.log(chalk.cyan('      npx kombinat-writer --reset'))
        console.log(chalk.cyan('      npx kombinat-writer --force-reset   # skips the modified-locally check'))
        console.log(chalk.yellow(''))
        console.log(chalk.yellow('  Refresh recommended. Exiting.'))
        process.exit(0)
    }

    // ── --reset / --force-reset: confirm before destructive overwrite ──
    if (existingManifest && (args.reset || args.forceReset)) {
        // Check for locally-modified files
        const newManifest = buildManifest(DEST_DIR, { packageVersion: 'unknown', packageCommit: 'unknown', packageRoot: PKG_ROOT, pluginOwnedSubtrees: [] })
        const { diffManifest } = await import('./lib/manifest.mjs')
        const diff = diffManifest(existingManifest, DEST_DIR)
        const locallyModified = diff.modified
        if (locallyModified.length > 0 && !args.forceReset) {
            if (args.nonInteractive) {
                console.log(chalk.red(`✗ Refusing to reset: ${locallyModified.length} files are modified locally.`))
                console.log(chalk.red('  Use --force-reset to override (destructive).'))
                process.exit(2)
            }
            console.log(chalk.yellow(`⚠ ${locallyModified.length} files are modified locally.`))
            const ok = await confirm({ message: 'Proceed with --reset and lose your local edits?', default: false })
            if (!ok) { console.log(chalk.yellow('Aborted.')); process.exit(0) }
        }
        console.log(chalk.yellow('Resetting plugin assets to current source state...'))
    }

    console.log(chalk.white('\nKombinat Writer — Professional Book Writing Workflow'));
    console.log(chalk.gray('Installs the /kombinat writing workflow into .opencode/\n'));

    // ── Per-project acknowledgement (interactive only) ──
    if (!args.nonInteractive) {
        await printPerProjectAck()
    }

    let track = 'fiction'
    let importChoice = 'none'
    let importedFiles = []
    let isSeries = false
    let seriesTitle = null
    let seriesAuthor = null
    let bookNumber = null
    let seriesId = null

    let bookCount = 1;
    let targetBooks = [];

    if (args.nonInteractive) {
        // Defaults: track=fiction, no import, no series
        // (For postinstall / CI, we keep things simple.)
        targetBooks = [path.join(process.cwd(), 'book')];
    } else {
        track = await select({
            message: 'Which track do you want to use for this project?',
            choices: [
                { name: 'Fiction', value: 'fiction', description: 'Novels, short stories, serials, creative non-fiction' },
                { name: 'Non-Fiction', value: 'non-fiction', description: 'Academic works, journalism, biography, technical books' },
                { name: 'Mixed', value: 'mixed', description: 'Creative non-fiction, memoir with research, narrative journalism' },
            ],
        });

        // ── Lorebook / Premise import option ──
        importChoice = await select({
            message: 'Do you have a lorebook, premise, or world-building document to import?',
            choices: [
                { name: 'No', value: 'none', description: 'Start from scratch' },
                { name: 'Yes — Lorebook (SillyTavern/JanitorAI/CharacterAI JSON)', value: 'lorebook', description: 'Import a world info / character card export' },
                { name: 'Yes — Premise document (Markdown, text, outline)', value: 'premise', description: 'Import a written premise, synopsis, or idea file' },
            ],
        });

        if (importChoice !== 'none') {
            const { input } = await import('@inquirer/prompts');
            const rawInput = await input({
                message: importChoice === 'lorebook'
                    ? 'Path to your lorebook JSON file(s):'
                    : 'Path to your premise/idea document(s):',
                default: '',
            });

            // (Path parsing logic — unchanged from original)
            let paths;
            if (rawInput.includes('"') || rawInput.includes("'")) {
                const quoted = [];
                const quoteRegex = /["']([^"']+)["']/g;
                let match;
                let lastIdx = 0;
                while ((match = quoteRegex.exec(rawInput)) !== null) {
                    const before = rawInput.slice(lastIdx, match.index).trim();
                    if (before) quoted.push(...before.split(/\s+/).filter(Boolean));
                    quoted.push(match[1]);
                    lastIdx = quoteRegex.lastIndex;
                }
                const after = rawInput.slice(lastIdx).trim();
                if (after) quoted.push(...after.split(/\s+/).filter(Boolean));
                paths = quoted;
            } else {
                const PLACEHOLDER = '\x00SPACE\x00';
                paths = rawInput
                    .replace(/\\ /g, PLACEHOLDER)
                    .split(/\s+/)
                    .map(p => p.replace(new RegExp(PLACEHOLDER, 'g'), ' '))
                    .filter(p => p.length > 0);
            }

            paths = paths
                .map(p => p.trim())
                .filter(p => p.length > 0)
                .map(p => {
                    if (p.startsWith('~/')) return path.join(process.env.HOME, p.slice(2));
                    if (!path.isAbsolute(p)) return path.resolve(p);
                    return p;
                });

            for (const p of paths) {
                if (fs.existsSync(p)) {
                    const destName = importChoice === 'lorebook'
                        ? (importedFiles.length === 0 ? 'imported-lorebook.json' : `imported-lorebook-${importedFiles.length}.json`)
                        : (importedFiles.length === 0 ? 'premise.md' : `premise-${importedFiles.length}.md`);
                    const destPath = path.join(process.cwd(), destName);
                    fs.copySync(p, destPath);
                    success(`Imported ${path.basename(p)} → ${destName}`);
                    importedFiles.push(destPath);
                } else {
                    warn(`File not found: "${p}" — skipping`);
                }
            }
            if (importedFiles.length === 0 && rawInput.trim()) {
                warn('No files could be imported — you can add them later via /kombinat manifest');
            }
        }

        // ── Series init option ──
        isSeries = await select({
            message: 'Is this project part of a series?',
            choices: [
                { name: 'No — standalone book', value: false, description: 'Single-book project' },
                { name: 'Yes — new series', value: 'new', description: 'Initialize a new series and plan the books' },
                { name: 'Yes — add a book to existing series', value: 'existing', description: 'Link to an existing ./series/ directory' },
            ],
        });

        if (isSeries === 'new') {
            const { input, number } = await import('@inquirer/prompts');
            seriesTitle = await input({ message: 'Series title:', default: '' });
            seriesAuthor = await input({ message: 'Author name:', default: '' });
            seriesId = seriesTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'series';
            bookCount = await number({ message: 'How many books are planned for the series?', default: 3, min: 1 });
            
            for (let i = 1; i <= bookCount; i++) {
                targetBooks.push(path.join(process.cwd(), 'series', `book${i}`));
            }
        } else if (isSeries === 'existing') {
            const { input, number } = await import('@inquirer/prompts');
            bookNumber = await number({ message: 'Book number in series:', default: 2 });
            targetBooks.push(path.join(process.cwd(), 'series', `book${bookNumber}`));
            if (fs.existsSync(path.join(process.cwd(), 'series', 'meta.json'))) {
                const meta = fs.readJsonSync(path.join(process.cwd(), 'series', 'meta.json'));
                seriesId = meta.id || meta.seriesId;
                seriesTitle = meta.title;
                seriesAuthor = meta.author;
            } else {
                seriesId = await input({ message: 'Series ID (folder-safe, e.g. my-series):', default: 'series' });
            }
        } else {
            targetBooks = [path.join(process.cwd(), 'book')];
        }
    }

    header('Project Structure');
    for (const bookPath of targetBooks) {
        await initProjectStructure(track, args.nonInteractive, bookPath);
    }

    // Create series infrastructure if requested
    if (isSeries) {
        const seriesDir = path.join(process.cwd(), 'series');
        const lorebookDir = path.join(seriesDir, 'lorebook');
        fs.ensureDirSync(lorebookDir);
        if (!fs.existsSync(path.join(lorebookDir, 'characters.md'))) {
            fs.writeFileSync(path.join(lorebookDir, 'characters.md'), '# Series Characters\n\n*Cross-book character profiles.*\n', 'utf-8');
        }
        if (!fs.existsSync(path.join(lorebookDir, 'world.md'))) {
            fs.writeFileSync(path.join(lorebookDir, 'world.md'), '# Series World\n\n*World-setting, geography, history, cosmology.*\n', 'utf-8');
        }
        if (!fs.existsSync(path.join(lorebookDir, 'glossary.md'))) {
            fs.writeFileSync(path.join(lorebookDir, 'glossary.md'), '# Series Glossary\n\n*Terms, names, places, and concepts.*\n', 'utf-8');
        }
        if (!fs.existsSync(path.join(lorebookDir, 'timeline.json'))) {
            fs.writeJsonSync(path.join(lorebookDir, 'timeline.json'), { entries: [] }, { spaces: 2 });
        }
        if (!fs.existsSync(path.join(lorebookDir, 'threads.md'))) {
            fs.writeFileSync(path.join(lorebookDir, 'threads.md'), '# Series Plot Threads\n\n*Cross-book story threads.*\n', 'utf-8');
        }

        // Series metadata
        let meta = { id: seriesId, title: seriesTitle, author: seriesAuthor, bookCount: 1, books: [] };
        const metaPath = path.join(seriesDir, 'meta.json');
        if (fs.existsSync(metaPath)) {
            try { meta = { ...meta, ...fs.readJsonSync(metaPath) }; } catch {}
        }
        meta.bookCount = Math.max(meta.bookCount || 1, bookNumber);
        const bookTitle = path.basename(process.cwd());
        const existingIdx = meta.books.findIndex(b => b.number === bookNumber);
        const bookEntry = { number: bookNumber, title: bookTitle, path: '.' };
        if (existingIdx >= 0) meta.books[existingIdx] = bookEntry;
        else meta.books.push(bookEntry);
        meta.books.sort((a, b) => a.number - b.number);
        fs.writeJsonSync(metaPath, meta, { spaces: 2 });

        // Link current book
        const trackPath = path.join(process.cwd(), 'book', 'track.json');
        if (fs.existsSync(trackPath)) {
            const track = fs.readJsonSync(trackPath);
            track.seriesId = seriesId;
            track.bookNumber = bookNumber;
            fs.writeJsonSync(trackPath, track, { spaces: 2 });
        }

        success(`Series infrastructure initialized: seriesId=${seriesId}, bookNumber=${bookNumber}`);
    }

    header('Installing Workflow');

    if (args.nonInteractive || args.reset || args.forceReset) {
        // Non-interactive path: use sync.mjs with 'overwrite' mode. No prompts.
        const syncMode = (args.reset || args.forceReset) ? 'overwrite' : 'install'
        const skillsR = syncCopySkills(DEST_DIR, track, syncMode)
        const toolsR = syncCopyToolsAndLib(DEST_DIR, syncMode)
        const cmdsR = syncCopySlashCommands(DEST_DIR, syncMode)
        syncCopyTemplates(DEST_DIR, track)
        const pluginR = syncCopySidebarPlugin(DEST_DIR, syncMode)
        syncEnsureProjectConfig(DEST_DIR)
        log(`  Skills:    ${skillsR.copied} copied, ${skillsR.skipped} skipped`)
        log(`  Tools:     ${toolsR.copied} copied, ${toolsR.skipped} skipped`)
        log(`  Commands:  ${cmdsR.copied} copied, ${cmdsR.skipped} skipped`)
        log(`  Plugin:    ${pluginR.copied} copied (${pluginR.source})`)
    } else {
        // Interactive path: use the local copy functions with conflict prompts.
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
        await ensureProjectConfig();
    }

    header('Installation Complete');

    // ── Write the install manifest ──
    // Records what was installed, with per-file SHA256, so refresh.mjs can
    // diff against it on subsequent runs.
    try {
        const packageVersion = (() => {
            try { return JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf-8')).version }
            catch { return 'unknown' }
        })()
        const packageCommit = (() => {
            try { return execSync('git rev-parse --short HEAD', { cwd: PKG_ROOT, encoding: 'utf-8' }).trim() }
            catch { return 'unknown' }
        })()
        const manifest = buildManifest(DEST_DIR, {
            packageVersion,
            packageCommit,
            packageRoot: PKG_ROOT,
            pluginOwnedSubtrees: [], // informational; refresh.mjs uses plugin-tree.mjs
            loreIndex: { lastBuildAt: null, needsRebuild: true },
        })
        writeManifest(DEST_DIR, manifest)
        success(`Wrote install manifest (${manifest.files.length} files tracked)`)
    } catch (err) {
        warn(`Could not write install manifest: ${err.message}`)
    }

    log('');
    log('  Installed to .opencode/:');
    log(`    ${chalk.green('\u2713')} skills/`);
    log(`    ${chalk.green('\u2713')} tools/ (incl. hubs/kombinat/ + lib/)`);
    log(`    ${chalk.green('\u2713')} commands/kombinat-router.md`);
    log(`    ${chalk.green('\u2713')} templates/`);
    log(`    ${chalk.green('\u2713')} plugins/kombinat-sidebar/ (built bundle)`);
    log('');
    log(`  ${chalk.green('\u2713')} tui.json — TUI keybinds + plugin path`);
    log(`  ${chalk.green('\u2713')} opencode.jsonc — plugin registered (loads the sidebar)`);
    log(`  ${chalk.green('\u2713')} package.json — runtime deps (solid-js, @opentui/solid, fs-extra)`);
    log('');
    log('  Next steps:');
    log('    1. Open your project in OpenCode (restart if already open)');
    log('    2. Verify plugin loaded: opencode debug info should list kombinat-sidebar');
    log('    3. Type /kombinat to open the instant phase menu');
    if (isSeries) {
        log(`    ✓ Series linked: ${seriesId}, book ${bookNumber}`);
    }
    if (importedFiles.length > 0) {
        log(`    ${isSeries ? '3' : '3'}. Run /kombinat constitute — it will detect your imported ${importChoice === 'lorebook' ? 'lorebook' : 'premise'} file${importedFiles.length > 1 ? 's' : ''} and use it`);
    } else {
        log('    3. Or invoke a specific phase directly (e.g. /kombinat outline)');
    }
    log('');
    log('  Phases: guided, constitute, specify, clarify, research, outline,');
    log('          task-manager, draft, critique, revise, edit, review,');
    log('          cite, publish, track, timeline, meta, drafter,');
    log('          verify, resume, cycle, pacing-audit, hook-review,');
    log('          read-through, series, refresh-index, refresh');
    log('');
}

main().catch(err => { error(err.message); process.exit(1); });