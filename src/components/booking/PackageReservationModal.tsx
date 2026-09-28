import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Loader2, Calendar, Phone, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import PhoneInput, { formatPhone, getDialCodeForCountry, parsePhone } from '../ui/PhoneInput';
import { COUNTRIES } from '../../data/countries';
import type { CoachingPackage } from '../../types';

interface PackageReservationModalProps {
  isOpen: boolean;
  packageItem: CoachingPackage | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PackageReservationModal({
  isOpen,
  packageItem,
  onClose,
  onSuccess,
}: PackageReservationModalProps): JSX.Element | null {
  const { user, profile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dialCode, setDialCode] = useState('+20');
  const [localPhone, setLocalPhone] = useState('');
  const [country, setCountry] = useState('EG');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill user profile if logged in
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.email) setEmail(profile.email);
      if (profile.country) setCountry(profile.country);
      if (profile.phone) {
        const parsed = parsePhone(profile.phone);
        setDialCode(parsed.dialCode);
        setLocalPhone(parsed.local);
      }
    } else if (user) {
      if (user.email) setEmail(user.email);
    }
  }, [profile, user, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSubmitted(false);
    }
  }, [isOpen]);

  if (!isOpen || !packageItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDigits = localPhone.replace(/\D/g, '');

    if (!cleanName) {
      setError('Please provide your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!localPhone || cleanDigits.length < 7) {
      setError('A working phone / WhatsApp number is required so Mai’s assistant can reach you.');
      return;
    }
    if (!country) {
      setError('Please select your country of residence.');
      return;
    }

    const fullPhone = formatPhone(dialCode, localPhone);
    setSubmitting(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error: insertErr } = await supabase.from('bookings').insert({
        user_id: user?.id ?? null,
        appointment_type_id: `package-${packageItem.id}`,
        appointment_type_title: packageItem.title,
        appointment_date: todayStr,
        appointment_time: 'Unscheduled',
        time_zone: 'Africa/Cairo',
        parent_name: cleanName,
        email: cleanEmail,
        phone: fullPhone,
        country,
        child_name: childName.trim() || null,
        child_age: childAge.trim() || null,
        notes: `[Package Reservation: ${packageItem.title} · ${packageItem.sessions} Sessions] Awaiting calendar times scheduling by Mai's assistant. Client notes: ${notes.trim() || 'None'}`,
        status: 'pending',
        intake_suggested_package: packageItem.id,
      });

      if (insertErr) {
        throw new Error(insertErr.message);
      }

      setSubmitted(true);
      onSuccess();
    } catch (err) {
      console.error('Package reservation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to record reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-charcoal/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-modal-title"
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-beige bg-white p-4 shadow-2xl focus:outline-none sm:p-5"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-warm-gray transition hover:bg-ivory hover:text-charcoal disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {!submitted ? (
          <>
            {/* Modal Header */}
            <div className="border-b border-beige/80 pb-2.5 pr-8">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-sage-dark">
                <Sparkles className="h-3.5 w-3.5 text-sage-dark" />
                <span>1:1 Coaching Engagement</span>
              </div>
              <h2 id="package-modal-title" className="font-serif text-lg font-bold text-charcoal sm:text-xl mt-0.5">
                Reserve {packageItem.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-charcoal">
                  EGP {packageItem.price.toLocaleString()}
                </span>
                <span className="text-warm-gray">·</span>
                <span className="text-warm-gray font-medium">
                  {packageItem.sessions} {packageItem.sessions === 1 ? 'Session' : 'Sessions'} (60 min each)
                </span>
                <span className="text-warm-gray">·</span>
                <span className="text-warm-gray font-medium">
                  Paced over ~{packageItem.useWithinWeeks} weeks
                </span>
              </div>
            </div>

            {/* How Calendar Scheduling Works (Pristine explanation) */}
            <div className="my-2.5 rounded-2xl border border-amber-300/80 bg-amber-50/70 p-2.5 text-[11px] leading-relaxed text-amber-950 sm:text-xs">
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" />
                <div>
                  <p className="font-bold text-amber-950">How Calendar Scheduling Works:</p>
                  <p className="mt-0.5 text-amber-900 leading-snug">
                    Once your reservation is confirmed, <strong>Mai’s executive assistant will reach out directly via WhatsApp & Email</strong> to coordinate and schedule your preferred consultation dates & times on the calendar.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-2.5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-charcoal mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full rounded-xl border border-beige bg-cream/50 px-3 py-1.5 text-xs font-medium text-charcoal outline-none transition focus:border-sage focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-charcoal mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full rounded-xl border border-beige bg-cream/50 px-3 py-1.5 text-xs font-medium text-charcoal outline-none transition focus:border-sage focus:bg-white"
                  />
                </div>
              </div>

              {/* Country & Phone */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-charcoal mb-1">
                    Country of Residence *
                  </label>
                  <select
                    value={country}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setCountry(newCountry);
                      const prefix = getDialCodeForCountry(newCountry);
                      if (prefix) setDialCode(prefix);
                    }}
                    className="w-full rounded-xl border border-beige bg-cream/50 px-3 py-1.5 text-xs font-medium text-charcoal outline-none transition focus:border-sage focus:bg-white cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.iso} value={c.iso}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <PhoneInput
                    label="WhatsApp / Phone Number *"
                    value={`${dialCode}${localPhone}`}
                    onChange={(val) => {
                      const { dialCode: d, local } = parsePhone(val || null);
                      setDialCode(d);
                      setLocalPhone(local);
                    }}
                  />
                </div>
              </div>

              {/* Child Details */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-charcoal mb-1">
                    Child's Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="e.g. Leo"
                    className="w-full rounded-xl border border-beige bg-cream/50 px-3 py-2 text-xs font-medium text-charcoal outline-none transition focus:border-sage focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-charcoal mb-1">
                    Child's Age (Optional)
                  </label>
                  <input
                    type="text"
                    value={childAge}
                    onChange={(e) => setChildAge(e.target.value)}
                    placeholder="e.g. 4 years"
                    className="w-full rounded-xl border border-beige bg-cream/50 px-3 py-2 text-xs font-medium text-charcoal outline-none transition focus:border-sage focus:bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-charcoal mb-1">
                  Primary Objectives / Specific Challenges
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell Mai a few words about what you are navigating..."
                  className="w-full rounded-xl border border-beige bg-cream/50 px-3 py-2 text-xs font-medium text-charcoal outline-none transition focus:border-sage focus:bg-white resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-beige flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-full border border-beige bg-white px-4 py-2 text-xs font-bold text-warm-gray hover:bg-cream transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-sage-dark px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-sage transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Package Reservation</span>
                      <Check className="h-4 w-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[10.5px] text-warm-gray justify-center pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-sage-dark shrink-0" />
                <span>Strictly private & confidential clinical advisory</span>
              </div>
            </form>
          </>
        ) : (
          /* Confirmation Success Screen */
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
                Package Reserved Successfully!
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-warm-gray max-w-sm mx-auto">
                Thank you, <strong>{fullName}</strong>. Your reservation for the <strong>{packageItem.title}</strong> has been received.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-left text-xs text-amber-950 space-y-2 max-w-md mx-auto">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Phone className="h-4 w-4 text-amber-800" />
                <span>Next Step: Calendar Scheduling</span>
              </div>
              <p className="text-amber-900 leading-relaxed">
                Mai’s executive assistant will reach out directly to your WhatsApp / phone (<strong>{formatPhone(dialCode, localPhone)}</strong>) within 24 hours to schedule your session dates & times on the calendar.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-sage-dark px-8 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-sage transition"
              >
                Close & Return
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
