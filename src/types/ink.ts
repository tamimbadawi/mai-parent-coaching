export type InkTool = 'pen' | 'highlighter' | 'eraser' | 'stamp';

export type PaperStyle = 'lined' | 'dotted' | 'grid' | 'blank';

export type PenSize = 'fine' | 'medium' | 'bold';

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

export interface InkStamp {
  id: string;
  type: 'stamp';
  emoji: string;
  x: number;
  y: number;
}

export interface InkPage {
  id: string;
  pageNumber: number;
  strokes: InkStroke[];
  stamps?: InkStamp[];
  paperStyle?: PaperStyle;
  createdAt?: string;
  updatedAt?: string;
}

export const INK_PAGE_WIDTH = 800;
export const INK_PAGE_HEIGHT = 1130; // Standard A4-like aspect ratio (1 : 1.4125)

export const INK_COLORS = {
  charcoal: '#232120',
  sage: '#3E5C46',
  terracotta: '#B85C42',
  dustyRose: '#B26B7E',
  oceanBlue: '#2C5E7A',
  plum: '#5E3A58',
  highlighter: '#D97706',
} as const;

export const PEN_SIZES: Record<PenSize, number> = {
  fine: 2.8,
  medium: 4.8,
  bold: 7.5,
};

export const STAMP_EMOJIS = ['⭐', '❤️', '✓', '❗', '💡', '🙂'] as const;
export type StampEmoji = (typeof STAMP_EMOJIS)[number];
