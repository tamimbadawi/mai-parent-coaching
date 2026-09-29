import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { WhatsAppSettings } from '../../types';

export default function WhatsAppWidget(): JSX.Element | null {
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('whatsapp_settings')
          .select('id, whatsapp_phone, whatsapp_message, is_widget_enabled')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;

        if (error || !data) {
          setSettings(null);
        } else {
          setSettings(data as WhatsAppSettings);
        }
      } catch {
        if (isMounted) {
          setSettings(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // Gracefully hide if loading, disabled, or missing settings
  if (isLoading || !settings || !settings.is_widget_enabled) {
    return null;
  }

  // Sanitize phone number (strip all non-digit characters, including '+' for wa.me URL format)
  const cleanPhone = settings.whatsapp_phone ? settings.whatsapp_phone.replace(/[^\d]/g, '') : '';
  if (!cleanPhone) {
    return null;
  }

  const encodedMessage = encodeURIComponent(settings.whatsapp_message || '');
  const whatsappUrl = `https://wa.me/${cleanPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sage text-white shadow-lg transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
    >
      <MessageCircle className="h-7 w-7 text-white" aria-hidden="true" />
    </a>
  );
}
