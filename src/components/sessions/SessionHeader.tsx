import React from 'react';
import { Calendar, Clock, Video, User, CheckCircle2, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import type { SessionTranscript } from '../../types/session';

interface SessionHeaderProps {
  session: SessionTranscript;
  childName?: string;
  childAge?: string;
  isMockMode?: boolean;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  session,
  childName,
  childAge,
  isMockMode = true,
}) => {
  const formattedDate = new Date(session.sessionDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(session.sessionDate).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-6 border border-beige/80 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Client & Session Title */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sage/20 text-sage-dark border border-sage/30">
              <Sparkles className="w-3.5 h-3.5" />
              Session #{session.sessionNumber}
            </span>

            {isMockMode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100/80 text-amber-800 border border-amber-300">
                Simulated Mode
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Transcribed & Analyzed
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl text-charcoal mt-2 tracking-tight">
            {session.clientName}
          </h1>

          <div className="flex items-center gap-4 text-xs sm:text-sm text-charcoal/70 mt-1 flex-wrap">
            {childName && (
              <div className="flex items-center gap-1.5 font-medium text-charcoal/85">
                <User className="w-4 h-4 text-sage-dark" />
                Child: {childName} {childAge ? `(${childAge})` : ''}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-charcoal/50" />
              <span>{formattedDate} at {formattedTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-charcoal/50" />
              <span>{session.durationMinutes} minutes</span>
            </div>
            {session.googleMeetUrl && (
              <a
                href={session.googleMeetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sage-dark hover:underline"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Meet Recording</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Right: Focus Areas */}
        <div className="lg:text-right">
          <span className="text-xs uppercase tracking-wider text-charcoal/60 font-medium block mb-1.5">
            Focus Areas & Dynamics
          </span>
          <div className="flex items-center gap-1.5 flex-wrap lg:justify-end">
            {session.focusAreas.map((area, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-ivory text-charcoal/85 border border-beige/70"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
