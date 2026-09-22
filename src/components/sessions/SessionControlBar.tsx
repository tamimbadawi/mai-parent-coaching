import React from 'react';
import {
  Users,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  User,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import type { ClientSessionSummary, SessionTranscript } from '../../types/session';

interface SessionControlBarProps {
  clients: ClientSessionSummary[];
  selectedClientId: string;
  selectedSessionId: string;
  onSelectClient: (clientId: string) => void;
  onSelectSession: (sessionId: string) => void;
  activeSession: SessionTranscript;
  activeClient: ClientSessionSummary;
  isMockMode?: boolean;
}

export const SessionControlBar: React.FC<SessionControlBarProps> = ({
  clients,
  selectedClientId,
  selectedSessionId,
  onSelectClient,
  onSelectSession,
  activeSession,
  activeClient,
  isMockMode = true,
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-xs rounded-2xl px-4 py-2.5 border border-beige/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Left: Client Dropdown + Session Dropdown (Handles unlimited sessions cleanly) */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 1. Client Selector Dropdown */}
        <div className="flex items-center gap-2 bg-[#faf8f4] px-2.5 py-1.5 rounded-xl border border-beige/80">
          <div className="w-7 h-7 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-charcoal/50 uppercase tracking-wider leading-none">
              Client
            </span>
            <select
              value={selectedClientId}
              onChange={(e) => onSelectClient(e.target.value)}
              className="font-serif text-xs sm:text-sm font-semibold text-charcoal bg-transparent border-0 focus:outline-hidden cursor-pointer hover:text-sage-dark transition-colors py-0.5 pl-0 pr-4"
            >
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.clientName}
                </option>
              ))}
            </select>
          </div>

          {activeClient.childName && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white text-charcoal/70 border border-beige/80 px-2 py-0.5 rounded-md shrink-0">
              <User className="w-2.5 h-2.5 text-sage-dark" />
              {activeClient.childName} {activeClient.childAge ? `(${activeClient.childAge})` : ''}
            </span>
          )}
        </div>

        {/* 2. Session Selector Dropdown (Robust for 9+ sessions) */}
        <div className="flex items-center gap-2 bg-[#faf8f4] px-2.5 py-1.5 rounded-xl border border-beige/80">
          <div className="w-7 h-7 rounded-lg bg-charcoal/10 border border-charcoal/20 flex items-center justify-center text-charcoal shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-charcoal/50 uppercase tracking-wider leading-none">
              Session
            </span>
            <select
              value={selectedSessionId}
              onChange={(e) => onSelectSession(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-charcoal bg-transparent border-0 focus:outline-hidden cursor-pointer hover:text-sage-dark transition-colors py-0.5 pl-0 pr-4"
            >
              {activeClient.sessions.map((sess) => {
                const sDate = new Date(sess.sessionDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                return (
                  <option key={sess.id} value={sess.id}>
                    Session #{sess.sessionNumber} — {sDate} ({sess.durationMinutes}m)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Right: Quick Metadata (Focus areas, Duration, Meet Link, Mode) */}
      <div className="flex items-center gap-2 flex-wrap md:justify-end text-xs">
        {/* Focus areas */}
        <div className="hidden xl:flex items-center gap-1">
          {activeSession.focusAreas.slice(0, 2).map((area, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md text-[11px] bg-ivory text-charcoal/70 border border-beige/60"
            >
              {area}
            </span>
          ))}
        </div>

        {/* Meet Link */}
        {activeSession.googleMeetUrl && (
          <a
            href={activeSession.googleMeetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-sage-dark bg-sage/10 hover:bg-sage/20 px-2.5 py-1 rounded-md border border-sage/30 transition-colors"
          >
            <Video className="w-3 h-3" />
            <span>Meet</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}

        {/* Mode badge */}
        {isMockMode && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
            Simulated
          </span>
        )}
      </div>
    </div>
  );
};
