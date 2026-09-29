import { useState, useEffect, type FormEvent } from 'react';
import { Loader2, CheckCircle2, AlertCircle, MessageCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Panel } from './AdminUI';
import type { WhatsAppSettings } from '../../../types';

export default function AdminWhatsAppSettingsForm(): JSX.Element {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>('+201005809498');
  const [message, setMessage] = useState<string>(
    "Hi Mai! 👋 I'd love to learn how you can help my family with parenting, burnout recovery, or coaching. What's the best way to get started?"
  );
  const [isWidgetEnabled, setIsWidgetEnabled] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current settings on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchSettings() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('whatsapp_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          // If table not yet migrated or fetch failed, fallback gracefully
          setToastMessage({
            type: 'error',
            text: 'Could not load existing settings. Default values are ready.',
          });
        } else if (data) {
          const row = data as WhatsAppSettings;
          setSettingsId(row.id);
          if (row.whatsapp_phone) setPhone(row.whatsapp_phone);
          if (row.whatsapp_message) setMessage(row.whatsapp_message);
          setIsWidgetEnabled(row.is_widget_enabled ?? true);
        }
      } catch {
        if (isMounted) {
          setToastMessage({
            type: 'error',
            text: 'An unexpected error occurred while fetching settings.',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // Clear toast message after 4.5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const validatePhone = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setPhoneError('Phone number is required');
      return false;
    }
    // Expected format: + followed by 7-15 digits (e.g. +201005809498)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(trimmed)) {
      setPhoneError('Please enter a valid international phone number (e.g. +201005809498)');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (phoneError) {
      validatePhone(val);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validatePhone(phone)) {
      return;
    }

    if (!message.trim()) {
      setToastMessage({ type: 'error', text: 'Welcome message cannot be empty' });
      return;
    }

    setIsSaving(true);
    setToastMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

      // 1. Check for any existing rows to clean up duplicates (keep only 1 row)
      const { data: existingRows, error: fetchError } = await supabase
        .from('whatsapp_settings')
        .select('id')
        .order('updated_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const rows = (existingRows || []) as { id: string }[];
      const primaryId = settingsId || (rows.length > 0 ? rows[0].id : null);

      // Clean up multiple old rows if they exist
      if (rows.length > 1) {
        const extraIds = rows.filter((r) => r.id !== primaryId).map((r) => r.id);
        if (extraIds.length > 0) {
          await supabase.from('whatsapp_settings').delete().in('id', extraIds);
        }
      }

      if (primaryId) {
        // Update existing row
        const { error: updateError } = await supabase
          .from('whatsapp_settings')
          .update({
            whatsapp_phone: phone.trim(),
            whatsapp_message: message.trim(),
            is_widget_enabled: isWidgetEnabled,
            updated_at: new Date().toISOString(),
            updated_by: currentUserId,
          })
          .eq('id', primaryId);

        if (updateError) throw new Error(updateError.message);
        setSettingsId(primaryId);
      } else {
        // Insert initial row
        const { data: inserted, error: insertError } = await supabase
          .from('whatsapp_settings')
          .insert({
            whatsapp_phone: phone.trim(),
            whatsapp_message: message.trim(),
            is_widget_enabled: isWidgetEnabled,
            updated_at: new Date().toISOString(),
            updated_by: currentUserId,
          })
          .select('id')
          .single();

        if (insertError) throw new Error(insertError.message);
        if (inserted) setSettingsId(inserted.id);
      }

      setToastMessage({
        type: 'success',
        text: 'WhatsApp settings updated successfully',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save WhatsApp settings';
      setToastMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cleanPhone = phone.replace(/[^\d]/g, '');
  const previewWaUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message || '')}`
    : '';

  return (
    <Panel
      title="Floating Widget & Direct Contact"
      eyebrow="Website Visitor Settings"
      action={
        <div className="flex items-center gap-2">
          {previewWaUrl && (
            <a
              href={previewWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-beige/90 bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-cream transition-colors"
              title="Test WhatsApp link"
            >
              <ExternalLink className="h-3.5 w-3.5 text-warm-gray" />
              <span>Test Link</span>
            </a>
          )}
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-xs transition-all ${
              toastMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Phone Number Input */}
          <div className="space-y-1.5">
            <label htmlFor="whatsapp-phone-input" className="block text-xs font-medium text-charcoal">
              WhatsApp Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              id="whatsapp-phone-input"
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={() => validatePhone(phone)}
              placeholder="+201005809498"
              disabled={isLoading || isSaving}
              required
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-mono text-charcoal placeholder-warm-gray/60 transition-colors focus:outline-none focus:ring-1 ${
                phoneError
                  ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-400'
                  : 'border-beige/90 focus:border-sage focus:ring-sage'
              } disabled:opacity-60`}
            />
            {phoneError ? (
              <p className="text-[11px] text-rose-600">{phoneError}</p>
            ) : (
              <p className="text-[11px] text-warm-gray">
                Format: <span className="font-mono font-medium">+201005809498</span> (include international country code)
              </p>
            )}
          </div>

          {/* Toggle Widget Enable Checkbox */}
          <div className="flex flex-col justify-center rounded-xl border border-beige/60 bg-cream/30 p-3.5">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isWidgetEnabled}
                onChange={(e) => setIsWidgetEnabled(e.target.checked)}
                disabled={isLoading || isSaving}
                className="mt-0.5 h-4 w-4 rounded border-beige text-sage focus:ring-sage accent-sage cursor-pointer disabled:opacity-60"
              />
              <div>
                <span className="text-xs font-medium text-charcoal">Enable Floating WhatsApp Widget</span>
                <p className="text-[11px] text-warm-gray mt-0.5 leading-relaxed">
                  Shows the circular WhatsApp button at the bottom-right on all public website pages.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Message Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="whatsapp-message-input" className="block text-xs font-medium text-charcoal">
              Welcome / Prefilled Greeting Message <span className="text-rose-500">*</span>
            </label>
            <span
              className={`font-mono text-[11px] ${
                message.length >= 480 ? 'text-rose-600 font-semibold' : 'text-warm-gray'
              }`}
            >
              {message.length} / 500
            </span>
          </div>
          <textarea
            id="whatsapp-message-input"
            rows={3}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading || isSaving}
            required
            placeholder="Hi Mai! 👋 I'd love to learn how you can help my family..."
            className="w-full rounded-xl border border-beige/90 bg-white px-3.5 py-2.5 text-xs text-charcoal placeholder-warm-gray/60 transition-colors focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage disabled:opacity-60 leading-relaxed"
          />
          <p className="text-[11px] text-warm-gray">
            This message is pre-filled when visitors click the floating button, making it effortless for them to initiate conversation.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-beige/60">
          <div className="flex items-center gap-2 text-[11px] text-warm-gray">
            <MessageCircle className="h-3.5 w-3.5 text-sage" />
            <span>Target: wa.me direct deep link</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-sage px-5 py-2 text-xs font-medium text-white hover:bg-sage-dark active:bg-sage-dark/90 transition-colors disabled:opacity-50 shadow-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <span>Save WhatsApp Settings</span>
            )}
          </button>
        </div>
      </form>
    </Panel>
  );
}
