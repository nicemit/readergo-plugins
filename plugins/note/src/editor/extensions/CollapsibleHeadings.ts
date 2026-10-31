import { Extension } from '@tiptap/core'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view'

export const HEADING_TOGGLE_EVENT = 'readergo:toggle-heading'

export const collapsibleHeadingsKey = new PluginKey<ReadonlySet<string>>('collapsibleHeadings')

/**
 * Numbers every heading in document order to produce the same identifiers the
 * outline uses (`heading-0`, `heading-1`, …). Keeping both panes on one
 * numbering scheme is what lets a click in either address the same section.
 */
function forEachHeading(
  doc: ProseMirrorNode,
  visit: (node: ProseMirrorNode, pos: number, id: string, isTopLevel: boolean) => void
) {
  let index = 0
  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return true
    visit(node, pos, `heading-${index}`, doc.resolve(pos).depth === 0)
    index += 1
    return false
  })
}

function createToggle(headingId: string, level: number, collapsed: boolean) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'rg-heading-toggle'
  button.contentEditable = 'false'
  button.setAttribute('data-no-swipe', 'true')
  button.setAttribute('data-heading-id', headingId)
  button.setAttribute('aria-expanded', String(!collapsed))
  button.setAttribute(
    'aria-label',
    `${collapsed ? 'Expand' : 'Collapse'} level ${level} heading section`
  )
  button.title = collapsed ? 'Expand section' : 'Collapse section'
  button.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'

  const emit = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
    button.dispatchEvent(
      new CustomEvent(HEADING_TOGGLE_EVENT, { detail: { headingId }, bubbles: true })
    )
  }

  // Handled on press rather than click so the editor never moves the selection
  // into the heading, which on mobile would pop the keyboard open.
  button.addEventListener('mousedown', emit)
  button.addEventListener('touchstart', emit, { passive: false })
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
  })

  return button
}

function buildDecorations(doc: ProseMirrorNode, collapsed: ReadonlySet<string>) {
  const decorations: Decoration[] = []
  const headingIdByPos = new Map<number, string>()

  forEachHeading(doc, (node, pos, id, isTopLevel) => {
    headingIdByPos.set(pos, id)
    if (isTopLevel) return
    // Nested headings (inside blockquotes, list items, …) are addressable by
    // the outline but cannot be collapsed.
    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        'data-heading-id': id,
        'data-heading-level': String(node.attrs.level),
      })
    )
  })

  const blocks: Array<{ node: ProseMirrorNode; pos: number }> = []
  doc.forEach((node, offset) => blocks.push({ node, pos: offset }))

  let hiddenBelowLevel = 0

  blocks.forEach(({ node, pos }, index) => {
    const level = node.type.name === 'heading' ? (node.attrs.level as number) : 0

    if (level > 0 && hiddenBelowLevel > 0 && level <= hiddenBelowLevel) {
      hiddenBelowLevel = 0
    }

    if (hiddenBelowLevel > 0) {
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: 'rg-collapsed-hidden' }))
      return
    }

    if (level === 0) return

    const headingId = headingIdByPos.get(pos)
    if (!headingId) return

    // Only offer a toggle when something follows that collapsing would hide.
    const next = blocks[index + 1]
    const hasSection =
      !!next && !(next.node.type.name === 'heading' && (next.node.attrs.level as number) <= level)

    const isCollapsed = hasSection && collapsed.has(headingId)

    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: [
          'rg-heading',
          hasSection ? 'rg-heading-collapsible' : '',
          isCollapsed ? 'rg-heading-collapsed' : '',
        ]
          .filter(Boolean)
          .join(' '),
        'data-heading-id': headingId,
        'data-heading-level': String(level),
      })
    )

    if (hasSection) {
      decorations.push(
        Decoration.widget(pos + 1, () => createToggle(headingId, level, isCollapsed), {
          side: -1,
          key: `heading-toggle-${headingId}-${isCollapsed}`,
          ignoreSelection: true,
        })
      )
    }

    if (isCollapsed) {
      hiddenBelowLevel = level
    }
  })

  return DecorationSet.create(doc, decorations)
}

/**
 * Renders collapse toggles beside headings and hides the blocks that belong to
 * a collapsed section.
 *
 * Collapsing is presentation only - the document is never modified, so a
 * collapsed section cannot be lost on save and never leaks into exported HTML.
 */
export const CollapsibleHeadings = Extension.create({
  name: 'collapsibleHeadings',

  addProseMirrorPlugins() {
    return [
      new Plugin<ReadonlySet<string>>({
        key: collapsibleHeadingsKey,
        state: {
          init: () => new Set<string>(),
          apply: (tr, value) => tr.getMeta(collapsibleHeadingsKey) ?? value,
        },
        props: {
          decorations(state) {
            return buildDecorations(state.doc, collapsibleHeadingsKey.getState(state) ?? new Set())
          },
        },
      }),
    ]
  },
})

/** Pushes the current collapsed set into the editor so decorations refresh. */
export function applyCollapsedHeadings(view: EditorView, collapsed: ReadonlySet<string>) {
  view.dispatch(
    view.state.tr.setMeta(collapsibleHeadingsKey, collapsed).setMeta('addToHistory', false)
  )
}
