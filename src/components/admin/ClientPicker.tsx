import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Users, User, ChevronDown, ChevronRight, Search } from 'lucide-react';
import type { ClientSessionSummary } from '../../types/session';

export interface ClientPickerProps {
  clients: ClientSessionSummary[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  activeClient?: ClientSessionSummary;
}

interface VisibleClientItem {
  type: 'client';
  client: ClientSessionSummary;
  clientId: string;
  hasMembers: boolean;
  isExpanded: boolean;
}

interface VisibleMemberItem {
  type: 'member';
  client: ClientSessionSummary;
  clientId: string;
  member: { name: string; role: string };
  memberIndex: number;
}

type VisibleItem = VisibleClientItem | VisibleMemberItem;

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

/**
 * Returns formatted household member count, defaulting to 1 member if no members present.
 */
function formatHouseholdMemberCount(client?: ClientSessionSummary): string {
  if (!client) return '1 member';
  const count = client.members && client.members.length > 0 ? client.members.length : 1;
  return `${count} ${count === 1 ? 'member' : 'members'}`;
}

export const ClientPicker: React.FC<ClientPickerProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  activeClient: propActiveClient,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(new Set());
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

  // Case-insensitive substring match on clientName or any household member name
  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedClients;
    return sortedClients.filter((client) => {
      const clientNameMatch = client.clientName?.toLowerCase().includes(q);
      const memberMatch = client.members?.some((m) => m.name?.toLowerCase().includes(q));
      const childMatch = client.childName?.toLowerCase().includes(q);
      return Boolean(clientNameMatch || memberMatch || childMatch);
    });
  }, [sortedClients, searchQuery]);

  // Manage expanded state:
  // With no search text, all rows start collapsed.
  // When search matches through a member, families expand automatically.
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setExpandedClientIds(new Set());
    } else {
      const autoExpanded = new Set<string>();
      for (const client of filteredClients) {
        const matchesMember = client.members?.some((m) => m.name.toLowerCase().includes(q));
        if (matchesMember) {
          autoExpanded.add(client.clientId);
        }
      }
      setExpandedClientIds(autoExpanded);
    }
  }, [searchQuery, filteredClients]);

  // Flatten visible items based on current expansion state
  const visibleItems: VisibleItem[] = useMemo(() => {
    const items: VisibleItem[] = [];
    for (const client of filteredClients) {
      const hasMembers = Boolean(client.members && client.members.length > 0);
      const isExpanded = expandedClientIds.has(client.clientId);
      items.push({
        type: 'client',
        client,
        clientId: client.clientId,
        hasMembers,
        isExpanded,
      });
      if (hasMembers && isExpanded) {
        client.members!.forEach((member, mIdx) => {
          items.push({
            type: 'member',
            client,
            clientId: client.clientId,
            member,
            memberIndex: mIdx,
          });
        });
      }
    }
    return items;
  }, [filteredClients, expandedClientIds]);

  // When opening popover, reset search and set initial highlight to active client
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setExpandedClientIds(new Set());
      const idx = sortedClients.findIndex((c) => c.clientId === selectedClientId);
      setHighlightedIndex(idx >= 0 ? idx : 0);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen, selectedClientId, sortedClients]);

  // Highlight selection logic when search query changes:
  // When searching, find and highlight the first matching item (e.g. matching member if matched through member).
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return; // Do not reset highlight on expand/collapse when search is empty
    }

    const matchIdx = visibleItems.findIndex((item) => {
      if (item.type === 'member') {
        return item.member.name.toLowerCase().includes(q);
      }
      return item.client.clientName.toLowerCase().includes(q);
    });
    setHighlightedIndex(matchIdx >= 0 ? matchIdx : 0);
  }, [searchQuery, visibleItems]);

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

  const toggleExpand = (clientId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (visibleItems.length > 0) {
        setHighlightedIndex((prev) => (prev < visibleItems.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibleItems.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : visibleItems.length - 1));
      }
    } else if (e.key === 'ArrowRight') {
      const current = visibleItems[highlightedIndex];
      if (current && current.type === 'client' && current.hasMembers && !current.isExpanded) {
        e.preventDefault();
        setExpandedClientIds((prev) => new Set(prev).add(current.clientId));
      }
    } else if (e.key === 'ArrowLeft') {
      const current = visibleItems[highlightedIndex];
      if (current) {
        if (current.type === 'client' && current.isExpanded) {
          e.preventDefault();
          setExpandedClientIds((prev) => {
            const next = new Set(prev);
            next.delete(current.clientId);
            return next;
          });
        } else if (current.type === 'member') {
          e.preventDefault();
          setExpandedClientIds((prev) => {
            const next = new Set(prev);
            next.delete(current.clientId);
            return next;
          });
          const parentIdx = visibleItems.findIndex(
            (v) => v.type === 'client' && v.clientId === current.clientId
          );
          if (parentIdx >= 0) {
            setHighlightedIndex(parentIdx);
          }
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (visibleItems[highlightedIndex]) {
        handleSelect(visibleItems[highlightedIndex].clientId);
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
            title={activeClient ? `${activeClient.clientName} (${formatHouseholdMemberCount(activeClient)})` : 'Select client'}
          >
            <span className="truncate">
              {activeClient
                ? `${activeClient.clientName} (${formatHouseholdMemberCount(activeClient)})`
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
          className="absolute left-0 top-full mt-1.5 w-[280px] sm:w-[290px] max-h-[320px] bg-white rounded-xl border border-beige/80 shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
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
                placeholder="Search client or member..."
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
                {visibleItems.map((item, index) => {
                  const isHighlighted = index === highlightedIndex;

                  if (item.type === 'client') {
                    const isSelected = item.client.clientId === selectedClientId;
                    return (
                      <li key={item.client.clientId} role="option" aria-selected={isSelected}>
                        <div
                          className={`w-full flex items-center justify-between gap-1 text-xs rounded-lg px-2 py-1 transition-colors ${
                            isHighlighted
                              ? 'bg-sage/15 text-sage-dark font-medium'
                              : isSelected
                              ? 'bg-[#faf8f4] text-charcoal font-medium'
                              : 'text-charcoal hover:bg-[#faf8f4]'
                          }`}
                        >
                          {/* Left: Expand/collapse chevron + Client name button */}
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            {item.hasMembers ? (
                              <button
                                type="button"
                                onClick={(e) => toggleExpand(item.client.clientId, e)}
                                className="w-5 h-5 flex items-center justify-center text-charcoal/50 hover:text-charcoal rounded hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                                title={item.isExpanded ? 'Collapse family' : 'Expand family'}
                                aria-label={item.isExpanded ? 'Collapse family' : 'Expand family'}
                              >
                                <ChevronRight
                                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                    item.isExpanded ? 'rotate-90 text-charcoal' : 'text-charcoal/60'
                                  }`}
                                />
                              </button>
                            ) : (
                              <span className="w-5 shrink-0" />
                            )}

                            <button
                              type="button"
                              ref={(el) => {
                                itemRefs.current[index] = el;
                              }}
                              onClick={() => handleSelect(item.client.clientId)}
                              onMouseEnter={() => setHighlightedIndex(index)}
                              className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer focus:outline-hidden py-0.5"
                            >
                              <span className="truncate">{item.client.clientName}</span>
                              {item.client.isDemo && (
                                <span className="text-[9px] uppercase tracking-wider font-semibold px-1 py-0.2 rounded bg-amber-500/15 text-amber-800 border border-amber-500/30 shrink-0">
                                  (Demo)
                                </span>
                              )}
                            </button>
                          </div>

                          {/* Right: Household member count */}
                          <span className="text-[11px] text-charcoal/50 tabular-nums shrink-0 ml-1">
                            {formatHouseholdMemberCount(item.client)}
                          </span>
                        </div>
                      </li>
                    );
                  }

                  // Member row
                  return (
                    <li
                      key={`${item.client.clientId}-mem-${item.memberIndex}-${item.member.name}`}
                      role="option"
                    >
                      <div
                        className={`w-full flex items-center text-xs rounded-lg pl-8 pr-2 py-1 transition-colors ${
                          isHighlighted
                            ? 'bg-sage/15 text-sage-dark font-medium'
                            : 'text-charcoal/60 hover:bg-[#faf8f4] hover:text-charcoal'
                        }`}
                      >
                        <button
                          type="button"
                          ref={(el) => {
                            itemRefs.current[index] = el;
                          }}
                          onClick={() => handleSelect(item.client.clientId)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer focus:outline-hidden py-0.5"
                        >
                          <span className="truncate">
                            {item.member.name}{' '}
                            <span className="text-charcoal/40 font-normal">· {item.member.role}</span>
                          </span>
                        </button>
                      </div>
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
