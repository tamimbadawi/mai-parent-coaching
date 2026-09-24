import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Users, User, ChevronDown, Search } from 'lucide-react';
import type { ClientSessionSummary } from '../../types/session';

export interface ClientPickerProps {
  clients: ClientSessionSummary[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  activeClient?: ClientSessionSummary;
}

/**
 * Returns the timestamp of the client's most recent session (in ms), or 0 if none.
 */
function getLatestSessionTime(client: ClientSessionSummary): number {
  if (!client.sessions || client.sessions.length === 0) return 0;
  let maxTime = 0;
  for (const s of client.sessions) {
    if (s.sessionDate) {
      const time = new Date(s.sessionDate).getTime();
      if (!Number.isNaN(time) && time > maxTime) {
        maxTime = time;
      }
    }
  }
  return maxTime;
}

export const ClientPicker: React.FC<ClientPickerProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  activeClient: propActiveClient,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeClient = useMemo(() => {
    return propActiveClient || clients.find((c) => c.clientId === selectedClientId) || clients[0];
  }, [propActiveClient, clients, selectedClientId]);

  // Sort by most recent session date first
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const timeA = getLatestSessionTime(a);
      const timeB = getLatestSessionTime(b);
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      if (b.totalSessions !== a.totalSessions) {
        return b.totalSessions - a.totalSessions;
      }
      return a.clientName.localeCompare(b.clientName);
    });
  }, [clients]);

  // Case-insensitive substring match on clientName and childName
  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedClients;
    return sortedClients.filter((client) => {
      const clientNameMatch = client.clientName?.toLowerCase().includes(q);
      const childNameMatch = client.childName?.toLowerCase().includes(q);
      return Boolean(clientNameMatch || childNameMatch);
    });
  }, [sortedClients, searchQuery]);

  // Reset highlight to top when search query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // When opening, reset search and set highlight to active client if present
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const currentIndex = sortedClients.findIndex((c) => c.clientId === selectedClientId);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen, selectedClientId, sortedClients]);

  // Scroll highlighted item into view if it leaves visible area
  useEffect(() => {
    if (isOpen && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [highlightedIndex, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (clientId: string) => {
    onSelectClient(clientId);
    setIsOpen(false);
    triggerButtonRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredClients.length > 0) {
        setHighlightedIndex((prev) => (prev < filteredClients.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredClients.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredClients.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredClients[highlightedIndex]) {
        handleSelect(filteredClients[highlightedIndex].clientId);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerButtonRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      {/* 1. Client Selector Chip */}
      <div className="h-10 flex items-center gap-2 bg-[#faf8f4] px-2.5 rounded-xl border border-beige/80 shadow-2xs shrink-0">
        <div className="w-6 h-6 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
          <Users className="w-3 h-3" />
        </div>

        <div className="flex flex-col text-left justify-center">
          <span className="text-[9px] font-semibold text-charcoal/50 uppercase tracking-wider leading-none">
            Client ({clients.length})
          </span>
          <button
            type="button"
            ref={triggerButtonRef}
            onClick={() => setIsOpen((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
              }
            }}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-1 font-serif text-xs font-semibold text-charcoal bg-transparent border-0 focus:outline-hidden cursor-pointer hover:text-sage-dark transition-colors py-0 pl-0 pr-1 max-w-[130px] sm:max-w-[170px] truncate leading-tight text-left"
            title={activeClient ? `${activeClient.clientName} (${activeClient.totalSessions})` : 'Select client'}
          >
            <span className="truncate">
              {activeClient
                ? `${activeClient.clientName} (${activeClient.totalSessions})`
                : 'Select Client'}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-charcoal/50 shrink-0 transition-transform duration-150 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {activeClient?.childName && (
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-medium bg-white text-charcoal/70 border border-beige/80 px-1.5 py-0.5 rounded-md shrink-0">
            <User className="w-2.5 h-2.5 text-sage-dark" />
            <span className="max-w-[80px] truncate">{activeClient.childName}</span>
          </span>
        )}
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 w-[280px] max-h-[320px] bg-white rounded-xl border border-beige/80 shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          onKeyDown={handleKeyDown}
        >
          {/* Autofocused Search Input */}
          <div className="p-2 border-b border-beige/60 shrink-0 bg-[#faf8f4]/60">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-charcoal/40 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client or child..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-beige/80 rounded-lg text-charcoal placeholder:text-charcoal/40 focus:outline-hidden focus:border-sage-dark/60 transition-colors shadow-2xs"
                autoFocus
              />
            </div>
          </div>

          {/* Scrollable list */}
          <div
            ref={listRef}
            className="overflow-y-auto flex-1 p-1 max-h-[260px] divide-y divide-beige/30 focus:outline-hidden"
            tabIndex={-1}
          >
            {filteredClients.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-charcoal/50">
                No clients match
              </div>
            ) : (
              <ul className="space-y-0.5" role="listbox">
                {filteredClients.map((client, index) => {
                  const isSelected = client.clientId === selectedClientId;
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <li key={client.clientId} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        ref={(el) => {
                          itemRefs.current[index] = el;
                        }}
                        onClick={() => handleSelect(client.clientId)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer rounded-lg ${
                          isHighlighted
                            ? 'bg-sage/15 text-sage-dark font-medium'
                            : isSelected
                            ? 'bg-[#faf8f4] text-charcoal font-medium'
                            : 'text-charcoal hover:bg-[#faf8f4]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="truncate">{client.clientName}</span>
                          {client.childName && (
                            <span className="text-[11px] text-charcoal/50 truncate shrink-0">
                              ({client.childName})
                            </span>
                          )}
                          {client.isDemo && (
                            <span className="text-[9px] uppercase tracking-wider font-semibold px-1 py-0.2 rounded bg-amber-500/15 text-amber-800 border border-amber-500/30 shrink-0">
                              (Demo)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-charcoal/50 tabular-nums shrink-0 ml-1">
                          ({client.totalSessions})
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPicker;
