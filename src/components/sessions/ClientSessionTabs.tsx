import React from 'react';
import { Calendar, Users, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import type { ClientSessionSummary, SessionTranscript } from '../../types/session';

interface ClientSessionTabsProps {
  clients: ClientSessionSummary[];
  selectedClientId: string;
  selectedSessionId: string;
  onSelectClient: (clientId: string) => void;
  onSelectSession: (sessionId: string) => void;
}

export const ClientSessionTabs: React.FC<ClientSessionTabsProps> = ({
  clients,
  selectedClientId,
  selectedSessionId,
  onSelectClient,
  onSelectSession,
}) => {
  const currentClient = clients.find((c) => c.clientId === selectedClientId) || clients[0];

  return (
    <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-4 border border-beige/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Client Selector */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
          <Users className="w-5 h-5" />
        </div>

        <div>
          <label htmlFor="client-selector" className="text-[11px] font-semibold text-charcoal/55 uppercase tracking-wider block">
            Select Coaching Client
          </label>
          <select
            id="client-selector"
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className="font-serif text-base sm:text-lg font-medium text-charcoal bg-transparent border-0 focus:outline-hidden cursor-pointer hover:text-sage-dark transition-colors py-0 pl-0 pr-6"
          >
            {clients.map((c) => (
              <option key={c.clientId} value={c.clientId}>
                {c.clientName} ({c.childName ? `${c.childName}, ${c.childAge}` : `${c.totalSessions} sessions`})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Session Chronological Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
        <span className="text-xs text-charcoal/50 font-medium hidden lg:inline mr-1">
          Sessions:
        </span>
        {currentClient.sessions.map((sess) => {
          const isSelected = sess.id === selectedSessionId;
          const formattedDate = new Date(sess.sessionDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <button
              key={sess.id}
              onClick={() => onSelectSession(sess.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap border ${
                isSelected
                  ? 'bg-charcoal text-white border-charcoal shadow-xs'
                  : 'bg-ivory text-charcoal/80 border-beige/70 hover:border-charcoal/30 hover:bg-white'
              }`}
            >
              <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-sage' : 'text-charcoal/40'}`} />
              <span>Session #{sess.sessionNumber}</span>
              <span className={`text-[11px] font-mono ${isSelected ? 'text-white/70' : 'text-charcoal/50'}`}>
                {formattedDate}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
