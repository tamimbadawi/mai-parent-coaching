import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export function useCapacitorApp() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Configure Status Bar on mobile devices
    const setupStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#FFF8F8' });
        }
      } catch (err) {
        console.warn('StatusBar configuration not available:', err);
      }
    };

    setupStatusBar();

    // Handle Android Hardware Back Button
    const backButtonListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      // If user is not on the root page, navigate back
      if (location.pathname !== '/') {
        navigate(-1);
      } else {
        // Exit app on double tap or if on root
        CapApp.exitApp();
      }
    });

    // Handle Deep Linking / OAuth Callbacks (e.g. com.maiparentcoaching.app://auth/callback)
    const appUrlListener = CapApp.addListener('appUrlOpen', (event) => {
      try {
        const url = new URL(event.url);
        const pathWithQuery = url.pathname + url.search + url.hash;
        if (pathWithQuery) {
          navigate(pathWithQuery);
        }
      } catch (err) {
        console.warn('Failed to parse incoming deep link URL:', err);
      }
    });

    return () => {
      backButtonListener.then((sub) => sub.remove()).catch(() => {});
      appUrlListener.then((sub) => sub.remove()).catch(() => {});
    };
  }, [location.pathname, navigate]);
}
