/**
 * Chapter Dependency Graph
 *
 * Builds a directed graph mapping which chapters depend on which
 * prior chapters' events or reveals. Generated from the outline's
 * setup/payoff chains and character state changes.
 *
 * Essential for understanding revision impact — changing one chapter
 * can break downstream dependencies. Without a dependency graph,
 * revision decisions are blind.
 */

import fs from 'fs-extra';
import path from 'path';

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: Record<number, number[]>;    // chapter → chapters it depends on
  reverseAdjacency: Record<number, number[]>; // chapter → chapters that depend on it
  evidence: string[];
}

interface GraphNode {
  chapter: number;
  title: string;
  setupsDeclared: number;
  payoffsDeclared: number;
}

interface GraphEdge {
  from: number;      // chapter that sets up
  to: number;         // chapter that pays off
  description: string;
}

export function buildDependencyGraph(
  projectRoot: string
): DependencyGraph {
  const evidence: string[] = [];

  // Load outline
  const outlinePath = path.join(projectRoot, 'book', 'outline.md');
  const outlineShardPath = path.join(projectRoot, 'book', 'outline', '_main.md');

  let content: string;
  if (fs.existsSync(outlinePath)) {
    content = fs.readFileSync(outlinePath, 'utf-8');
  } else if (fs.existsSync(outlineShardPath)) {
    const shardDir = path.join(projectRoot, 'book', 'outline');
    const shards = fs.readdirSync(shardDir).filter(f => f.endsWith('.md')).sort();
    content = shards.map(s => fs.readFileSync(path.join(shardDir, s), 'utf-8')).join('\n\n');
  } else {
    evidence.push('✗ No outline found — cannot build dependency graph');
    return { nodes: [], edges: [], adjacency: {}, reverseAdjacency: {}, evidence };
  }

  // Parse chapters from outline
  const chapterRegex = /^##\s+Chapter\s+(\d+)\s*[:\-—]?\s*(.*)$/gim;
  const chapterMatches = [...content.matchAll(chapterRegex)];

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i = 0; i < chapterMatches.length; i++) {
    const m = chapterMatches[i];
    const num = parseInt(m[1]);
    const title = m[2].trim();
    const start = m.index ?? 0;
    const end = i + 1 < chapterMatches.length ? (chapterMatches[i + 1].index ?? content.length) : content.length;
    const block = content.slice(start, end);

    // Extract sets-up references
    const setsUpRegex = /sets[- ]?up:?\s*(.+)$/im;
    const setsUpMatch = block.match(setsUpRegex);
    const setsUpRefs = setsUpMatch ? parseRefList(setsUpMatch[1]) : [];

    // Extract payoff-from references
    const payoffRegex = /payoff[- ]?from:?\s*(.+)$/im;
    const payoffMatch = block.match(payoffRegex);
    const payoffRefs = payoffMatch ? parseRefList(payoffMatch[1]) : [];

    nodes.push({
      chapter: num,
      title,
      setupsDeclared: setsUpRefs.length,
      payoffsDeclared: payoffRefs.length,
    });

    // Build edges from sets-up references
    for (const ref of setsUpRefs) {
      const targetNum = parseChapterRef(ref);
      if (targetNum !== null) {
        edges.push({
          from: num,
          to: targetNum,
          description: ref,
        });
      }
    }
  }

  evidence.push(`✓ Parsed ${nodes.length} chapter nodes from outline`);
  evidence.push(`✓ Built ${edges.length} dependency edges from setup/payoff chains`);

  // Build adjacency maps
  const adjacency: Record<number, number[]> = {};
  const reverseAdjacency: Record<number, number[]> = {};

  for (const node of nodes) {
    adjacency[node.chapter] = [];
    reverseAdjacency[node.chapter] = [];
  }

  for (const edge of edges) {
    if (!adjacency[edge.from]) adjacency[edge.from] = [];
    if (!adjacency[edge.from].includes(edge.to)) {
      adjacency[edge.from].push(edge.to);
    }
    if (!reverseAdjacency[edge.to]) reverseAdjacency[edge.to] = [];
    if (!reverseAdjacency[edge.to].includes(edge.from)) {
      reverseAdjacency[edge.to].push(edge.from);
    }
  }

  // Find chapters with no dependencies (orphaned)
  for (const node of nodes) {
    if (adjacency[node.chapter].length === 0 && reverseAdjacency[node.chapter].length === 0) {
      evidence.push(`⚠ Chapter ${node.chapter}: no dependencies — isolated node`);
    }
  }

  // Find cycles (should not exist in a linear book, but check)
  const cycles = detectCycles(adjacency, nodes.map(n => n.chapter));
  if (cycles.length > 0) {
    evidence.push(`✗ Cycles detected: ${cycles.length} — setup/payoff chains form circular dependencies`);
    for (const cycle of cycles.slice(0, 3)) {
      evidence.push(`  Cycle: ${cycle.join(' → ')}`);
    }
  } else {
    evidence.push('✓ No circular dependencies detected');
  }

  return { nodes, edges, adjacency, reverseAdjacency, evidence };
}

function parseRefList(str: string): string[] {
  return str.split(/;|,|\band\b/i).map(s => s.trim()).filter(s => s.length > 0 && s.toLowerCase() !== 'none');
}

function parseChapterRef(ref: string): number | null {
  const match = ref.match(/(?:ch(?:apter)?\.?\s*|#?\s*)(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function detectCycles(adjacency: Record<number, number[]>, allNodes: number[]): number[][] {
  const cycles: number[][] = [];
  const visited = new Set<number>();
  const stack: number[] = [];

  function dfs(node: number) {
    if (stack.includes(node)) {
      const cycleStart = stack.indexOf(node);
      cycles.push([...stack.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.push(node);
    for (const neighbor of adjacency[node] || []) {
      dfs(neighbor);
    }
    stack.pop();
  }

  for (const node of allNodes) {
    if (!visited.has(node)) dfs(node);
  }

  return cycles;
}

export function formatDependencyGraph(graph: DependencyGraph): string {
  const lines: string[] = [];
  lines.push('# Chapter Dependency Graph');
  lines.push('');
  lines.push(`**Nodes:** ${graph.nodes.length} chapters`);
  lines.push(`**Edges:** ${graph.edges.length} setup→payoff dependencies`);
  lines.push('');

  // Adjacency list
  lines.push('## Forward Dependencies (what each chapter sets up)');
  lines.push('');
  for (const node of graph.nodes) {
    const deps = graph.adjacency[node.chapter] || [];
    if (deps.length > 0) {
      lines.push(`- **Chapter ${node.chapter}: ${node.title}** → ${deps.map(d => `Ch${d}`).join(', ')}`);
    }
  }
  lines.push('');

  // Reverse adjacency
  lines.push('## Reverse Dependencies (what each chapter depends on)');
  lines.push('');
  for (const node of graph.nodes) {
    const deps = graph.reverseAdjacency[node.chapter] || [];
    if (deps.length > 0) {
      lines.push(`- **Chapter ${node.chapter}: ${node.title}** ← ${deps.map(d => `Ch${d}`).join(', ')}`);
    }
  }
  lines.push('');

  // Edge list with descriptions
  lines.push('## Dependency Details');
  lines.push('');
  for (const edge of graph.edges) {
    lines.push(`- Ch${edge.from} → Ch${edge.to}: ${edge.description}`);
  }

  return lines.join('\n');
}

export function getRevisionImpact(
  graph: DependencyGraph,
  chapterToRevise: number
): { affectedChapters: number[]; impactPaths: string[] } {
  const affected = new Set<number>();
  const paths: string[] = [];

  function traceForward(ch: number, path: number[]) {
    const deps = graph.adjacency[ch] || [];
    for (const dep of deps) {
      if (!affected.has(dep)) {
        affected.add(dep);
        const newPath = [...path, dep];
        paths.push(`Ch${path[0]} → Ch${dep}: revision of Ch${path[0]} may break setup for Ch${dep}`);
        traceForward(dep, newPath);
      }
    }
  }

  affected.add(chapterToRevise);
  traceForward(chapterToRevise, [chapterToRevise]);

  return {
    affectedChapters: [...affected].sort((a, b) => a - b),
    impactPaths: paths,
  };
}