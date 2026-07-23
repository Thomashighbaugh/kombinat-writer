#!/usr/bin/env node
/**
 * Manifest — install/refresh manifest read/write/compare
 *
 * Records what was installed into a consumer project's .opencode/
 * directory, with per-file SHA256 hashes. Used by install.mjs to
 * write a manifest on completion, and by refresh.mjs to diff the
 * currently-installed state against the source.
 *
 * Manifest location: <DEST_DIR>/.kombinat-install-manifest.json
 *
 * Schema (v1):
 * {
 *   "schemaVersion": 1,
 *   "installedAt": "2026-07-13T...Z",
 *   "packageVersion": "0.2.1",
 *   "packageCommit": "63e9f8c",
 *   "packageRoot": "/path/to/kombinat-writer",
 *   "files": [
 *     { "rel": "skills/fiction/genre-knowledge/SKILL.md", "sha256": "..." },
 *     ...
 *   ],
 *   "pluginOwnedSubtrees": ["skills", "tools", "templates", "commands", "plugins", "tui.json", "opencode.jsonc", "package.json"],
 *   "loreIndex": {
 *     "lastBuildAt": "2026-07-13T...Z",
 *     "needsRebuild": false
 *   }
 * }
 */

import { createHash } from 'node:crypto'
import fs from 'fs-extra'
import path from 'path'

const MANIFEST_FILENAME = '.kombinat-install-manifest.json'
const SCHEMA_VERSION = 1

/**
 * Compute the SHA256 of a file's contents. Streams the file so it works on
 * multi-megabyte files without loading them entirely into memory.
 *
 * @param {string} filePath Absolute path
 * @returns {string} hex-encoded SHA256
 */
export function sha256File(filePath) {
    const h = createHash('sha256')
    h.update(fs.readFileSync(filePath))
    return h.digest('hex')
}

/**
 * Recursively walk a directory and return all files (relative to root).
 * Skips node_modules, .git, the manifest file itself, and the cache subtree
 * (cache is project-owned, except for cache/lore-index which the installer
 * writes to but never reads as "installed files").
 *
 * @param {string} root Absolute path to walk
 * @param {string} [base] Internal: the root path to relativize against
 * @returns {string[]} Array of absolute file paths
 */
export function walkFiles(root, base = root) {
    if (!fs.existsSync(root)) return []
    const out = []
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const full = path.join(root, entry.name)
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue
            out.push(...walkFiles(full, base))
        } else if (entry.isFile()) {
            if (entry.name === MANIFEST_FILENAME) continue
            out.push(full)
        }
    }
    return out
}

/**
 * Compute the manifest entries for a directory tree (relative paths + SHA256).
 *
 * @param {string} destDir The .opencode/ directory to scan
 * @returns {Array<{rel: string, sha256: string}>}
 */
export function computeFileEntries(destDir) {
    const files = walkFiles(destDir)
    return files
        .map(f => ({ rel: path.relative(destDir, f), sha256: sha256File(f) }))
        .sort((a, b) => a.rel.localeCompare(b.rel))
}

/**
 * Load a manifest from disk. Returns null if no manifest exists.
 *
 * @param {string} destDir The .opencode/ directory
 * @returns {object|null}
 */
export function loadManifest(destDir) {
    const p = path.join(destDir, MANIFEST_FILENAME)
    if (!fs.existsSync(p)) return null
    try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {
        return null
    }
}

/**
 * Write a manifest atomically (write to .tmp then rename).
 *
 * @param {string} destDir The .opencode/ directory
 * @param {object} manifest The manifest object
 */
export function writeManifest(destDir, manifest) {
    fs.ensureDirSync(destDir)
    const finalPath = path.join(destDir, MANIFEST_FILENAME)
    const tmpPath = finalPath + '.tmp'
    fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
    fs.renameSync(tmpPath, finalPath)
}

/**
 * Build a fresh manifest object with the current installed-file state.
 *
 * @param {string} destDir The .opencode/ directory
 * @param {object} meta { packageVersion, packageCommit, packageRoot, pluginOwnedSubtrees, loreIndex? }
 * @returns {object} The manifest object (not yet written)
 */
export function buildManifest(destDir, meta) {
    const loreIndex = meta.loreIndex ?? {
        lastBuildAt: null,
        needsRebuild: true,
    }
    return {
        schemaVersion: SCHEMA_VERSION,
        installedAt: new Date().toISOString(),
        packageVersion: meta.packageVersion ?? 'unknown',
        packageCommit: meta.packageCommit ?? 'unknown',
        packageRoot: meta.packageRoot ?? 'unknown',
        files: computeFileEntries(destDir),
        pluginOwnedSubtrees: meta.pluginOwnedSubtrees ?? [],
        loreIndex,
    }
}

/**
 * Compute the diff between an old manifest and the current installed state.
 *
 * @param {object} oldManifest The prior manifest
 * @param {string} destDir The current .opencode/ directory
 * @returns {{
 *   added: Array<{rel: string, sha256: string}>,      // new files on disk, not in old manifest
 *   removed: string[],                                  // files in old manifest, missing on disk
 *   unchanged: Array<{rel: string, sha256: string}>,    // same SHA in both
 *   modified: Array<{rel: string, oldSha: string, newSha: string}>  // different SHA
 * }}
 */
export function diffManifest(oldManifest, destDir) {
    const current = new Map(computeFileEntries(destDir).map(e => [e.rel, e.sha256]))
    const old = new Map((oldManifest.files || []).map(e => [e.rel, e.sha256]))
    const added = []
    const removed = []
    const unchanged = []
    const modified = []
    for (const [rel, sha] of current) {
        if (!old.has(rel)) added.push({ rel, sha256: sha })
        else if (old.get(rel) === sha) unchanged.push({ rel, sha256: sha })
        else modified.push({ rel, oldSha: old.get(rel), newSha: sha })
    }
    for (const rel of old.keys()) if (!current.has(rel)) removed.push(rel)
    return { added, removed, unchanged, modified }
}

export { MANIFEST_FILENAME, SCHEMA_VERSION }
