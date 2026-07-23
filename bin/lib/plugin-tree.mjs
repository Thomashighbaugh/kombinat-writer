#!/usr/bin/env node
/**
 * Plugin Tree — defines what is plugin-owned vs project-owned under .opencode/
 *
 * The refresh script must never touch project-owned paths. The install script
 * must never create files outside the plugin-owned set (except in the
 * special case of cache/lore-index/ which the index-builder writes to).
 *
 * If you change this list, also update the README's "Per-project install model"
 * section, and run a full refresh in every consumer project to make sure
 * nothing was missed.
 */

export const PLUGIN_OWNED_SUBTREES = [
    'skills',         // all .opencode/skills/* (except skills/user/, which is project-owned)
    'tools',          // all .opencode/tools/* (hub subcommand specs, lib modules, scripts)
    'templates',      // all .opencode/templates/*
    'commands',       // all .opencode/commands/* (except commands/user/, project-owned)
    'plugins',        // all .opencode/plugins/* (sidebar bundle, sidebar source)
    'tui.json',       // TUI keybind/theme + plugin path registration
    'opencode.jsonc', // main config; plugin path registration
    'package.json',   // runtime deps for the sidebar plugin
]

/** Paths under .opencode/ that the plugin writes to but does not own. */
export const PLUGIN_WRITES_BUT_NOT_OWNED = [
    'cache/lore-index',  // the lore index — written by build-lore-index.mjs, refreshed by refresh.mjs
]

/** Top-level paths under the project root that are always project-owned. */
export const PROJECT_OWNED_TOP_LEVEL = [
    'book',     // book/constitution.md, book/outline.md, book/drafts/, book/critique/, etc.
    'memory',   // author working memory
    'output',   // generated manuscript / publication output
    'series',   // series lorebook + series outline
    '.git',     // version control metadata
]

/** Paths under .opencode/ that are project-owned (not touched by refresh). */
export const PROJECT_OWNED_OPENCODE = [
    'state',              // session state, gitignored
    'cache',              // general cache (only cache/lore-index is plugin-written)
    'skills/user',        // user-authored skills
    'commands/user',      // user-authored slash commands
    'plugins/user',       // user-authored TUI plugins
    'tools/user',         // user-authored tools
]

/**
 * Decide whether a relative path (under DEST_DIR = .opencode/) is plugin-owned.
 *
 * @param {string} relPath Posix-style relative path, no leading slash
 * @returns {boolean}
 */
export function isPluginOwned(relPath) {
    relPath = relPath.replace(/\\/g, '/')
    // Exclude user subtrees first — they live under plugin-owned parents
    // but are themselves project-owned.
    for (const userPath of PROJECT_OWNED_OPENCODE) {
        if (relPath === userPath || relPath.startsWith(userPath + '/')) return false
    }
    for (const owned of PLUGIN_OWNED_SUBTREES) {
        if (relPath === owned || relPath.startsWith(owned + '/')) return true
    }
    return false
}

/**
 * Decide whether a path under the project root (not under .opencode/) is
 * project-owned. (Everything outside .opencode/ is project-owned by default;
 * this is the explicit list for documentation/assertion purposes.)
 *
 * @param {string} relPath Posix-style relative path from project root
 * @returns {boolean}
 */
export function isProjectOwnedTopLevel(relPath) {
    relPath = relPath.replace(/\\/g, '/')
    for (const top of PROJECT_OWNED_TOP_LEVEL) {
        if (relPath === top || relPath.startsWith(top + '/')) return true
    }
    return false
}

/**
 * Get a human-readable description of what is plugin-owned vs project-owned
 * for the refresh summary printout.
 *
 * @returns {string}
 */
export function describeOwnership() {
    return [
        `Plugin-owned subtrees: ${PLUGIN_OWNED_SUBTREES.join(', ')}`,
        `Project-owned (untouched): ${PROJECT_OWNED_TOP_LEVEL.join(', ')}, .opencode/state, .opencode/cache (except cache/lore-index), .opencode/skills/user, .opencode/commands/user, .opencode/tools/user, .opencode/plugins/user`,
    ].join('\n')
}
