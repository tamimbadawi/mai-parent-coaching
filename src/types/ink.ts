export type InkTool = 'pen' | 'highlighter' | 'eraser';

export interface InkPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface InkStroke {
  id: string;
  tool: InkTool;
  color: string;
  size: number;
  points: InkPoint[];
}

export interface InkPage {
  id: string;
  pageNumber: number;
  strokes: InkStroke[];
  createdAt?: string;
  updatedAt?: string;
}

export const INK_PAGE_WIDTH = 800;
export const INK_PAGE_HEIGHT = 1130; // Standard A4-like aspect ratio (1 : 1.4125)

export const INK_COLORS = {
  charcoal: '#232120',
  sage: '#3E5C46',
  terracotta: '#B85C42',
  highlighter: '#D97706',
} as const;
