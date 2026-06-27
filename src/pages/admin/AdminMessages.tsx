import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  created_at: string;
}

const AdminMessages = (): JSX.Element => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect((): void => {
    const fetch = async (): Promise<void> => {
      const { data } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      setMessages(data ?? []);
      setLoading(false);
    };
    void fetch();
  }, []);

  return (
    <AdminLayout title="Contact Messages">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage/30 border-t-sage" />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-[24px] border border-beige bg-white p-12 text-center shadow-sm">
          <p className="text-warm-gray">No contact messages yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-[20px] border border-beige bg-white shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-cream/50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/10 text-sage-dark text-xs font-bold uppercase">
                    {msg.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{msg.name}</p>
                    <p className="text-xs text-warm-gray truncate">{msg.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-xs text-warm-gray">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                  {expanded === msg.id ? (
                    <ChevronUp className="h-4 w-4 text-warm-gray" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-warm-gray" />
                  )}
                </div>
              </button>

              {expanded === msg.id && (
                <div className="border-t border-beige px-6 py-4 space-y-3 bg-cream/30">
                  <div className="flex gap-6 text-xs text-warm-gray flex-wrap">
                    <span>
                      <strong className="text-charcoal">Email:</strong> {msg.email}
                    </span>
                    {msg.phone && (
                      <span>
                        <strong className="text-charcoal">Phone:</strong> {msg.phone}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-charcoal whitespace-pre-wrap">{msg.message}</p>
                  <a
                    href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                    className="inline-flex items-center rounded-xl bg-sage px-4 py-2 text-xs font-medium text-white hover:bg-sage-dark transition-colors"
                  >
                    Reply via email
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminMessages;
