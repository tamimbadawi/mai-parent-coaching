import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

export interface DeleteUserTarget {
  id: string;
  email: string;
  name?: string | null;
}

interface DeleteUserModalProps {
  isOpen: boolean;
  user: DeleteUserTarget | null;
  hasHousehold: boolean;
  onClose: () => void;
  onConfirm: () => Promise<{ error?: string } | void>;
  onSuccess?: () => void;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  user,
  hasHousehold,
  onClose,
  onConfirm,
  onSuccess,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setIsDeleting(false);
      setErrorMessage(null);
    }
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  const title = hasHousehold
    ? 'Delete this user and their whole family?'
    : 'Delete this user?';

  const body = hasHousehold
    ? 'This permanently deletes the account, the family case, all sessions, notes and member records. This cannot be undone.'
    : 'This permanently deletes the account. This cannot be undone.';

  const isConfirmValid = confirmText.trim() === 'YES';

  const handleDelete = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isConfirmValid || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const result = await onConfirm();
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        setErrorMessage(result.error);
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
      onClose();
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'Failed to delete user.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl border border-beige bg-white p-6 shadow-2xl space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute right-4 top-4 rounded-xl p-2 text-warm-gray transition hover:bg-beige/40 hover:text-charcoal cursor-pointer disabled:opacity-40"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 id="delete-dialog-title" className="font-serif text-lg font-semibold text-charcoal leading-snug">
              {title}
            </h2>
            <p className="text-xs text-warm-gray mt-0.5">
              {user.name ? `${user.name} (${user.email})` : user.email}
            </p>
          </div>
        </div>

        {/* Body Warning */}
        <div className="rounded-2xl border border-rose-200/60 bg-rose-50/50 p-3.5 text-xs text-charcoal">
          <p className="leading-relaxed text-charcoal/90">{body}</p>
        </div>

        {/* Real Error Message Display */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Unable to delete user</p>
              <p className="mt-0.5 text-rose-700 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Type YES to confirm Form */}
        <form onSubmit={handleDelete} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label
              htmlFor="delete-confirm-input"
              className="block text-xs font-semibold uppercase tracking-wider text-charcoal"
            >
              Type YES to confirm
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Type YES to confirm"
              disabled={isDeleting}
              autoFocus
              className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3.5 py-2.5 text-sm text-charcoal outline-hidden focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition disabled:opacity-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-xl border border-beige px-4 py-2.5 text-xs font-medium text-charcoal hover:bg-beige/30 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmValid || isDeleting}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
