import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Calendar, User } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { SuperAdminGate } from '../../components/auth/SuperAdminGate';
import { TranscriptViewer } from '../../components/sessions/TranscriptViewer';
import { SessionChatPanel } from '../../components/sessions/SessionChatPanel';
import { useSessionChat } from '../../hooks/useSessionChat';
import { MOCK_CLIENT_SESSIONS } from '../../data/mockSessions';
import type { ClientSessionSummary, SessionTranscript } from '../../types/session';

export const AdminSessions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientSessionSummary[]>(MOCK_CLIENT_SESSIONS);

  // Client and Session state with URL synchronization
  const initialClientId = searchParams.get('client') || clients[0]?.clientId;
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);

  const activeClient = useMemo(
    () => clients.find((c) => c.clientId === selectedClientId) || clients[0],
    [clients, selectedClientId]
  );

  const initialSessionId =
    searchParams.get('session') || activeClient?.sessions[0]?.id || '';
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId);

  // When client changes, auto-select their first session
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const targetClient = clients.find((c) => c.clientId === clientId);
    if (targetClient && targetClient.sessions.length > 0) {
      const nextSessionId = targetClient.sessions[0].id;
      setSelectedSessionId(nextSessionId);
      setSearchParams({ client: clientId, session: nextSessionId });
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSearchParams({ client: selectedClientId, session: sessionId });
  };

  // Find active session
  const activeSession = useMemo(() => {
    return (
      activeClient.sessions.find((s) => s.id === selectedSessionId) ||
      activeClient.sessions[0]
    );
  }, [activeClient, selectedSessionId]);

  // Handler to update session across all 4 editable tabs
  const handleUpdateSession = (updatedSession: SessionTranscript) => {
    setClients((prevClients) =>
      prevClients.map((client) => {
        if (client.clientId !== activeClient.clientId) return client;
        return {
          ...client,
          sessions: client.sessions.map((sess) =>
            sess.id === updatedSession.id ? updatedSession : sess
          ),
        };
      })
    );
  };

  // Conversational Chat Hook
  const {
    messages,
    isGenerating,
    error,
    isMockMode,
    setIsMockMode,
    sendMessage,
    clearChat,
  } = useSessionChat({
    session: activeSession,
    allClientSessions: activeClient.sessions,
  });

  return (
    <SuperAdminGate>
      {() => (
        <AdminLayout
          title="Session Notes"
          subtitle="Structured clinical insights, action items, and conversational consultation."
          action={
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* 1. Client Selector Dropdown (matches mockup) */}
              <div className="flex items-center gap-2 bg-[#faf8f4] px-3 py-1.5 rounded-xl border border-beige/80 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>

                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-semibold text-charcoal/50 uppercase tracking-wider leading-none">
                    Client
                  </span>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleSelectClient(e.target.value)}
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

              {/* 2. Session Selector Dropdown (matches mockup) */}
              <div className="flex items-center gap-2 bg-[#faf8f4] px-3 py-1.5 rounded-xl border border-beige/80 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-charcoal/10 border border-charcoal/20 flex items-center justify-center text-charcoal shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>

                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-semibold text-charcoal/50 uppercase tracking-wider leading-none">
                    Session
                  </span>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => handleSelectSession(e.target.value)}
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
          }
        >
          {/* Main Content Grid directly under Header: Left 7/12 (Notes) + Right 5/12 (Assistant) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start lg:h-[calc(100vh-120px)] lg:max-h-[calc(100vh-120px)]">
            <div className="lg:col-span-7 h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
              <TranscriptViewer
                session={activeSession}
                onUpdateSession={handleUpdateSession}
              />
            </div>

            <div className="lg:col-span-5 h-full min-h-0 min-w-0 flex flex-col sticky top-2 overflow-hidden">
              <SessionChatPanel
                messages={messages}
                isGenerating={isGenerating}
                error={error}
                isMockMode={isMockMode}
                clientName={activeClient.clientName}
                onSendMessage={sendMessage}
                onClearChat={clearChat}
                onToggleMockMode={setIsMockMode}
              />
            </div>
          </div>
        </AdminLayout>
      )}
    </SuperAdminGate>
  );
};

export default AdminSessions;
