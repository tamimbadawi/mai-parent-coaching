import { getStroke } from 'perfect-freehand';
import { supabase } from './supabase';
import type { InkPage } from '../types/ink';
import { INK_PAGE_WIDTH, INK_PAGE_HEIGHT } from '../types/ink';

/**
 * Render an InkPage to a high-resolution JPEG (base64) using HTML Canvas.
 * Produces high-contrast black/dark strokes on clean white background for optimal OCR legibility.
 */
export async function renderInkPageToJpeg(
  page: InkPage,
  width = 1200,
  height = 1695
): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context unavailable');
      }

      // 1. Fill clean white paper background for OCR clarity
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // 2. Scale coordinate space from 800x1130 to output resolution
      const scaleX = width / INK_PAGE_WIDTH;
      const scaleY = height / INK_PAGE_HEIGHT;
      ctx.scale(scaleX, scaleY);

      // 3. Render strokes
      for (const stroke of page.strokes) {
        if (!stroke.points || stroke.points.length === 0) continue;

        // Render stroke outline via perfect-freehand
        const strokeOptions = {
          size: stroke.tool === 'highlighter' ? 22 : stroke.size || 4.5,
          thinning: stroke.tool === 'highlighter' ? 0 : 0.6,
          smoothing: 0.5,
          streamline: 0.5,
          simulatePressure: stroke.tool !== 'highlighter',
        };

        const outlinePoints = getStroke(
          stroke.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
          strokeOptions
        );

        if (!outlinePoints || outlinePoints.length === 0) continue;

        ctx.fillStyle = stroke.tool === 'highlighter' ? 'rgba(217, 119, 6, 0.4)' : stroke.color || '#232120';
        ctx.beginPath();
        const [firstX, firstY] = outlinePoints[0];
        ctx.moveTo(firstX, firstY);

        for (let i = 0; i < outlinePoints.length; i++) {
          const [x0, y0] = outlinePoints[i];
          const [x1, y1] = outlinePoints[(i + 1) % outlinePoints.length];
          ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        }

        ctx.closePath();
        ctx.fill();
      }

      // 4. Render stamps
      if (page.stamps && page.stamps.length > 0) {
        ctx.font = '36px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const stamp of page.stamps) {
          ctx.fillText(stamp.emoji, stamp.x, stamp.y);
        }
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      resolve({ base64Data, mimeType: 'image/jpeg' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Transcribe an InkPage using Gemini Flash-Lite OCR (same edge function and prompt as Photo OCR).
 */
export async function transcribeInkPage(page: InkPage): Promise<string> {
  const { base64Data, mimeType } = await renderInkPageToJpeg(page);

  const prompt =
    "Transcribe the handwriting exactly (English). Keep hand-drawn marks as symbols: star ⭐, heart ❤️, tick ✓, cross ✗, arrow →, exclamation ❗, question ❓, smiley 🙂, checkbox ☐ / ticked ☑. Circled or underlined words -> **bold**. Any other drawing -> a short description in brackets, e.g. [sketch: small house]. Keep line breaks and list structure. Don't summarise or add anything.";

  const { data, error } = await supabase.functions.invoke('gemini-generate', {
    body: {
      prompt,
      imageBase64: base64Data,
      imageMimeType: mimeType,
    },
  });

  if (error) {
    throw new Error(error.message || 'Gemini OCR failed to transcribe ink page');
  }

  const transcribedText = data?.text?.trim();
  if (!transcribedText) {
    throw new Error('No legible text could be extracted from this ink page.');
  }

  return transcribedText;
}
