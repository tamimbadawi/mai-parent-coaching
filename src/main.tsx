import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ui/ErrorBoundary.tsx';
import './index.css';

const brandFontWeights = [300, 400, 500, 600, 700] as const;

async function waitForBrandFonts() {
  if (!('fonts' in document)) return;

  await Promise.allSettled(
    brandFontWeights.map((weight) => document.fonts.load(`${weight} 1em Atma`)),
  );
}

void waitForBrandFonts().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
});
