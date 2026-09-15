import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Inbox, MailCheck, TimerReset } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import { EmptyPanel, Panel, StatCard } from './admin-ui';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  created_at: string;
}

const fallbackMessages: ContactMessage[] = [
  {
    id: 'sample-msg-1',
    name: 'Nour Hamdy',
    email: 'nour@example.com',
    phone: '+20 100 000 0000',
    subject: 'Looking for support with bedtime anxiety',
    message: 'I would love to understand whether private coaching or a course would be the best fit for us right now.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'sample-msg-2',
    name: 'Sara Adel',
    email: 'sara@example.com',
    phone: null,
    subject: 'Booking help for consultation session',
    message: 'I am interested in a consultation and wanted to ask about timings and next steps before I book.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

const AdminMessages = (): JSX.Element => {
  const [messages, setMessages] = useState<ContactMessage[]>(fallbackMessages);
  const [expanded, setExpanded] = useState<string | null>(null);

  const highTouchCount = messages.filter((message) => /book|help|support|session|course/i.test(message.subject)).length;

  useEffect((): void => {
    const fetch = async (): Promise<void> => {
      const { data } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      setMessages(data?.length ? data : fallbackMessages);
    };
    void fetch();
  }, []);

  return (
    <AdminLayout title="Contact Messages">
      {messages.length === 0 ? (
        <EmptyPanel title="No contact messages yet" description="New inquiries, collaboration requests, and support notes will arrive here in a reviewable inbox." />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={Inbox} label="Inbox volume" value={messages.length} detail="All open inquiries received through the public contact form." tone="sage" />
            <StatCard icon={TimerReset} label="High-touch inquiries" value={highTouchCount} detail="Messages that likely need a same-day response or personal follow-up." tone="amber" />
            <StatCard icon={MailCheck} label="Suggested SLA" value="4h" detail="A practical response window for high-intent leads and support requests." tone="sky" />
          </div>

          <Panel title="Message board" eyebrow="Organized inbox">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="overflow-hidden rounded-[26px] border border-beige bg-cream"
                >
                  <button
                    onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-white/60"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold uppercase text-sage-dark">
                        {msg.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-charcoal">{msg.name}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-warm-gray">
                            {/book|support|session|course/i.test(msg.subject) ? 'Priority' : 'Standard'}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-warm-gray">{msg.subject}</p>
                      </div>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-4">
                      <span className="text-xs text-warm-gray">{new Date(msg.created_at).toLocaleDateString()}</span>
                      {expanded === msg.id ? <ChevronUp className="h-4 w-4 text-warm-gray" /> : <ChevronDown className="h-4 w-4 text-warm-gray" />}
                    </div>
                  </button>

                  {expanded === msg.id && (
                    <div className="border-t border-beige bg-white px-5 py-5">
                      <div className="flex flex-wrap gap-6 text-xs text-warm-gray">
                        <span>
                          <strong className="text-charcoal">Email:</strong> {msg.email}
                        </span>
                        {msg.phone ? (
                          <span>
                            <strong className="text-charcoal">Phone:</strong> {msg.phone}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-charcoal">{msg.message}</p>
                      <a
                        href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                        className="mt-4 inline-flex items-center rounded-2xl bg-sage px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sage-dark"
                      >
                        Reply via email
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminMessages;
