import React, { useMemo } from 'react';
import { getStroke } from 'perfect-freehand';
import { Sparkles, Loader2, PenLine } from 'lucide-react';
import type { InkPage } from '../../types/ink';
import { INK_PAGE_WIDTH, INK_PAGE_HEIGHT } from '../../types/ink';

interface InkPageThumbnailProps {
  page: InkPage;
  onClick: () => void;
  onConvert?: () => void;
  isConverting?: boolean;
}

function getSvgPath(stroke: number[][]): string {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

export const InkPageThumbnail: React.FC<InkPageThumbnailProps> = ({
  page,
  onClick,
  onConvert,
  isConverting = false,
}) => {
  // Pre-generate SVG stroke paths for thumbnail
  const strokePaths = useMemo(() => {
    return page.strokes.map((stroke) => {
      const isHighlighter = stroke.tool === 'highlighter';
      const options = {
        size: isHighlighter ? 18 : 6,
        thinning: isHighlighter ? 0 : 0.6,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: !isHighlighter,
      };
      const outline = getStroke(
        stroke.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
        options
      );
      return {
        id: stroke.id,
        path: getSvgPath(outline),
        color: isHighlighter ? 'rgba(217, 119, 6, 0.45)' : stroke.color || '#232120',
        isHighlighter,
      };
    });
  }, [page.strokes]);

  return (
    <div
      onClick={onClick}
      className="group relative w-24 h-34 rounded-xl border border-beige/80 bg-[#FAF8F4] hover:border-sage hover:shadow-md transition cursor-pointer overflow-hidden flex flex-col justify-between p-1.5 shrink-0"
      title={`Open Page ${page.pageNumber} in notebook`}
    >
      {/* SVG Canvas Preview */}
      <div className="w-full flex-1 relative overflow-hidden rounded bg-[#FAF8F4] border border-beige/40">
        <svg
          viewBox={`0 0 ${INK_PAGE_WIDTH} ${INK_PAGE_HEIGHT}`}
          className="w-full h-full block pointer-events-none"
        >
          {/* Faint Margin Line */}
          <line
            x1="76"
            y1="0"
            x2="76"
            y2={INK_PAGE_HEIGHT}
            stroke="rgba(184, 92, 66, 0.2)"
            strokeWidth="2"
          />
          {/* Faint Header Line */}
          <line
            x1="0"
            y1="90"
            x2={INK_PAGE_WIDTH}
            y2="90"
            stroke="rgba(184, 92, 66, 0.2)"
            strokeWidth="2"
          />
          {/* Faint Ruled Lines */}
          {[160, 240, 320, 400, 480, 560, 640, 720, 800, 880, 960, 1040].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2={INK_PAGE_WIDTH}
              y2={y}
              stroke="rgba(170, 155, 140, 0.2)"
              strokeWidth="1.5"
            />
          ))}

          {/* Render Strokes */}
          {strokePaths.map((s) => (
            <path
              key={s.id}
              d={s.path}
              fill={s.color}
              style={s.isHighlighter ? { mixBlendMode: 'multiply' } : undefined}
            />
          ))}
        </svg>

        {/* Hover Action Badge */}
        <div className="absolute inset-0 bg-charcoal/10 backdrop-blur-[0.5px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
          <span className="p-1 rounded-full bg-white text-charcoal shadow-xs">
            <PenLine className="w-3 h-3 text-sage-dark" />
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-1 px-0.5">
        <span className="text-[10px] font-mono font-semibold text-charcoal/80">
          Page {page.pageNumber}
        </span>
        {onConvert && (
          <button
            type="button"
            disabled={isConverting || page.strokes.length === 0}
            onClick={(e) => {
              e.stopPropagation();
              onConvert();
            }}
            className="p-0.5 rounded text-warm-gray hover:text-sage-dark hover:bg-beige/40 transition"
            title="Convert this page to typed text via OCR"
          >
            {isConverting ? (
              <Loader2 className="w-3 h-3 animate-spin text-sage-dark" />
            ) : (
              <Sparkles className="w-3 h-3 text-sage-dark" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
