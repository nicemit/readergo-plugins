export type CanvasHostNote = {
  id: string;
  title?: string;
  content?: string;
  type?: string;
  data?: unknown;
};

export type CanvasHostAPI = {
  listNotes: () => Promise<CanvasHostNote[]>;
  getNote: (id: string) => Promise<CanvasHostNote | null>;
  openNote: (id: string) => void;
  updateNote?: (id: string, content: string) => Promise<void>;
};
