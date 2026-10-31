import type { ChartEdge, ChartNode } from './diagrams'

export type Box = {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export type EdgeDraw = ChartEdge & {
  d: string
  labelX: number
  labelY: number
}

export type GraphLayout = {
  width: number
  height: number
  nodes: Box[]
  edges: EdgeDraw[]
}

const PAD = 28
const GAP_X = 24
const GAP_Y = 80
const SIBLING_W = 220
const MIN_W = 176
const CHAIN_W = 400
const NODE_H = 108

function edgeId(edge: ChartEdge) {
  return `${edge.from}->${edge.to}`
}

function longestRanks(nodes: ChartNode[], forward: ChartEdge[]) {
  const incoming = new Map<string, string[]>()
  for (const node of nodes) incoming.set(node.id, [])
  for (const edge of forward) incoming.get(edge.to)?.push(edge.from)

  const rank = new Map<string, number>()
  const visiting = new Set<string>()
  const walk = (id: string): number => {
    const cached = rank.get(id)
    if (cached != null) return cached
    if (visiting.has(id)) return 0
    visiting.add(id)
    const preds = incoming.get(id) || []
    const value = preds.length === 0 ? 0 : Math.max(...preds.map((pred) => walk(pred) + 1))
    visiting.delete(id)
    rank.set(id, value)
    return value
  }
  for (const node of nodes) walk(node.id)
  return rank
}

function markBackEdges(nodes: ChartNode[], edges: ChartEdge[]) {
  const outgoing = new Map<string, ChartEdge[]>()
  for (const node of nodes) outgoing.set(node.id, [])
  for (const edge of edges) {
    if (edge.from === edge.to) continue
    outgoing.get(edge.from)?.push(edge)
  }
  const state = new Map<string, 0 | 1 | 2>()
  const back = new Set<string>()
  const dfs = (id: string) => {
    state.set(id, 1)
    for (const edge of outgoing.get(id) || []) {
      const next = state.get(edge.to) || 0
      if (next === 1) back.add(edgeId(edge))
      else if (next === 0) dfs(edge.to)
    }
    state.set(id, 2)
  }
  for (const node of nodes) {
    if (!state.has(node.id)) dfs(node.id)
  }
  return back
}

function groupRanks(nodes: ChartNode[], rank: Map<string, number>) {
  const groups = new Map<number, ChartNode[]>()
  for (const node of nodes) {
    const r = rank.get(node.id) || 0
    const list = groups.get(r) || []
    list.push(node)
    groups.set(r, list)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, list]) => list)
}

function barycenterSort(ranks: ChartNode[][], forward: ChartEdge[]) {
  const index = new Map<string, number>()
  ranks[0]?.forEach((node, i) => index.set(node.id, i))
  for (let r = 1; r < ranks.length; r += 1) {
    const prev = new Map(ranks[r - 1].map((node, i) => [node.id, i]))
    ranks[r] = [...ranks[r]].sort((a, b) => {
      const predsA = forward.filter((edge) => edge.to === a.id).map((edge) => prev.get(edge.from))
      const predsB = forward.filter((edge) => edge.to === b.id).map((edge) => prev.get(edge.from))
      const avg = (vals: (number | undefined)[]) => {
        const known = vals.filter((value): value is number => value != null)
        return known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : 0
      }
      return avg(predsA) - avg(predsB) || (index.get(a.id) || 0) - (index.get(b.id) || 0)
    })
    ranks[r].forEach((node, i) => index.set(node.id, i))
  }
}

function placeRank(
  items: ChartNode[],
  top: number,
  left: number,
  inner: number,
  boxes: Map<string, Box>,
) {
  const prefer = items.length === 1 ? Math.min(CHAIN_W, inner) : SIBLING_W
  const fit = Math.max(1, Math.floor((inner + GAP_X) / (MIN_W + GAP_X)))
  const cols = Math.min(items.length, fit)
  const nodeW = Math.min(prefer, Math.floor((inner - GAP_X * (cols - 1)) / cols))
  const rows = Math.ceil(items.length / cols)
  let bottom = top
  for (let row = 0; row < rows; row += 1) {
    const slice = items.slice(row * cols, row * cols + cols)
    const rowW = slice.length * nodeW + Math.max(0, slice.length - 1) * GAP_X
    let x = left + Math.max(0, (inner - rowW) / 2)
    const y = top + row * (NODE_H + GAP_Y)
    for (const node of slice) {
      boxes.set(node.id, { id: node.id, x, y, w: nodeW, h: NODE_H })
      x += nodeW + GAP_X
    }
    bottom = y + NODE_H
  }
  return bottom
}

function treePath(x1: number, y1: number, x2: number, y2: number) {
  if (Math.abs(x2 - x1) < 1.5) return `M ${x1} ${y1} L ${x2} ${y2}`
  const midY = (y1 + y2) / 2
  const dir = x2 >= x1 ? 1 : -1
  const r = Math.min(10, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2)
  return `M ${x1} ${y1} L ${x1} ${midY - r} Q ${x1} ${midY} ${x1 + dir * r} ${midY} L ${x2 - dir * r} ${midY} Q ${x2} ${midY} ${x2} ${midY + r} L ${x2} ${y2}`
}

function sideLoop(from: Box, to: Box, boundsW: number) {
  const x1 = from.x + from.w
  const y1 = from.y + from.h / 2
  const x2 = to.x + to.w
  const y2 = to.y + to.h / 2
  const rail = Math.min(boundsW - 8, Math.max(x1, x2) + 28)
  return {
    d: `M ${x1} ${y1} L ${rail} ${y1} L ${rail} ${y2} L ${x2} ${y2}`,
    labelX: rail,
    labelY: (y1 + y2) / 2,
  }
}

export function layoutGraph(
  nodes: ChartNode[],
  edges: ChartEdge[],
  containerWidth: number,
): GraphLayout {
  const width = Math.max(280, containerWidth)
  if (nodes.length === 0) {
    return { width, height: 220, nodes: [], edges: [] }
  }

  const known = new Set(nodes.map((node) => node.id))
  const usable = edges.filter(
    (edge) => known.has(edge.from) && known.has(edge.to) && edge.from !== edge.to,
  )
  const back = markBackEdges(nodes, usable)
  const forward = usable.filter((edge) => !back.has(edgeId(edge)))
  const rank = longestRanks(nodes, forward)
  const ranks = groupRanks(nodes, rank)
  barycenterSort(ranks, forward)

  const inner = width - PAD * 2
  const boxes = new Map<string, Box>()
  let y = PAD
  for (const row of ranks) {
    y = placeRank(row, y, PAD, inner, boxes) + GAP_Y
  }
  const height = y - GAP_Y + PAD

  const drawn: EdgeDraw[] = []
  for (const edge of usable) {
    const from = boxes.get(edge.from)
    const to = boxes.get(edge.to)
    if (!from || !to) continue
    if (back.has(edgeId(edge)) || to.y + to.h <= from.y + 4) {
      const loop = sideLoop(from, to, width)
      drawn.push({ ...edge, d: loop.d, labelX: loop.labelX, labelY: loop.labelY })
      continue
    }
    const x1 = from.x + from.w / 2
    const y1 = from.y + from.h
    const x2 = to.x + to.w / 2
    const y2 = to.y
    drawn.push({
      ...edge,
      d: treePath(x1, y1, x2, y2),
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2,
    })
  }

  return { width, height, nodes: [...boxes.values()], edges: drawn }
}
