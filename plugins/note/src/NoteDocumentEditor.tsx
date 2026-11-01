'use client';

import type { EditorProps } from '@readergo/plugin-sdk';
import { TipTapEditor } from './editor/TipTapEditor';

/**
 * DocumentEditor bridge for content plugins: host `content` / `onChange` map to TipTap.
 */
export function NoteDocumentEditor(props: EditorProps) {
  return <TipTapEditor {...props} />;
}
