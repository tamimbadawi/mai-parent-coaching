import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage, SessionTranscript } from '../types/session';

interface UseSessionChatOptions {
  session: SessionTranscript;
  allClientSessions?: SessionTranscript[];
}

export function useSessionChat({ session, allClientSessions = [] }: UseSessionChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(true);

  // Initialize/reset chat when session changes
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: `welcome-${session.id}`,
      sessionId: session.id,
      clientId: session.clientId,
      sender: 'gemini',
      content: `Hello Mai. I have indexed the full audio transcript and clinical notes for **${session.clientName}** (Session #${session.sessionNumber} • ${new Date(session.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}).

You can ask me to:
- Synthesize specific behavioral patterns or sensory triggers
- Draft an empathetic, non-overwhelming follow-up WhatsApp message
- Track progress between this session and previous consultations
- Brainstorm next-step micro-interventions for the upcoming session`,
      createdAt: new Date().toISOString(),
      suggestedFollowUps: [
        'Draft a supportive WhatsApp follow-up with the action items',
        'Summarize the primary emotional triggers identified in this session',
        'Compare progress in this session to earlier sessions',
      ],
    };

    setMessages([welcomeMessage]);
    setError(null);
  }, [session.id]);

  // Context-aware simulated intelligence engine
  const generateMockGeminiResponse = (userPrompt: string): { content: string; followUps?: string[] } => {
    const q = userPrompt.toLowerCase();

    // 1. WhatsApp follow-up draft
    if (q.includes('whatsapp') || q.includes('follow-up') || q.includes('message') || q.includes('draft')) {
      const parentActions = session.actionItems
        .filter((a) => a.category === 'parent')
        .map((a) => `• ${a.text}`)
        .join('\n');

      return {
        content: `Here is a warm, regulated WhatsApp message draft tailored for **${session.clientName}**:

---
*"Hi ${session.clientName.split(' ')[0]} 🌿 Mai here. I'm holding so much appreciation for your vulnerability and honesty in our session today.*

*Remember: you don't have to overhaul everything at once. Your only anchor this week is honoring that transition window when you arrive home.*

*Here are the two gentle commitments we agreed to explore:*
${parentActions || '• Practice your 3-second somatic pause before responding to dysregulation.'}

*Take a deep breath tonight. You are building safety, one micro-moment at a time. I am right here cheering you on."*
---

💡 *Clinical Note for Mai: Notice how this keeps the cognitive load low by centering only the core somatic practice rather than lecturing.*`,
        followUps: [
          'Can you make this message even shorter and simpler?',
          'What was the exact quote when the parent used the pause?',
        ],
      };
    }

    // 2. Behavioral / Emotional triggers
    if (q.includes('trigger') || q.includes('meltdown') || q.includes('emotional') || q.includes('tantrum')) {
      const triggers = session.emotionalObservations.identifiedTriggers
        .map((t) => `1. **${t}**`)
        .join('\n');

      return {
        content: `Based on the session transcript for **${session.clientName}**, here are the primary emotional and sensory triggers observed:

${triggers}

### Underlying Mechanism
The transcript reveals that these episodes are **sensory-overload defenses**, not cognitive defiance. In particular, the transition between high-stimulation environments (e.g. daycare/school) and the home boundary creates a rapid spike in sympathetic arousal.

### Key Therapeutic Observation
When ${session.clientName.split(' ')[0]} lowered her physical body to eye-level and reduced verbal lecturing, the duration of the de-escalation phase dropped from **~30 minutes down to ~3 minutes**.`,
        followUps: [
          'Draft a WhatsApp message focusing on this transition window',
          'What homework did we assign to address these triggers?',
        ],
      };
    }

    // 3. Progress comparison across sessions
    if (q.includes('progress') || q.includes('compare') || q.includes('previous') || q.includes('earlier')) {
      const prevSession = allClientSessions.find((s) => s.sessionNumber === session.sessionNumber - 1);

      if (prevSession) {
        return {
          content: `### Progress Comparison: Session #${prevSession.sessionNumber} ➔ Session #${session.sessionNumber}

| Metric / Domain | Session #${prevSession.sessionNumber} (${new Date(prevSession.sessionDate).toLocaleDateString()}) | Session #${session.sessionNumber} (${new Date(session.sessionDate).toLocaleDateString()}) |
| :--- | :--- | :--- |
| **Parental Stress Level** | ${prevSession.emotionalObservations.parentalStressLevel} | ${session.emotionalObservations.parentalStressLevel} (Shifted to calmer somatic anchor) |
| **Nervous System State** | ${prevSession.emotionalObservations.nervousSystemState.replace(/_/g, ' ')} | ${session.emotionalObservations.nervousSystemState.replace(/_/g, ' ')} |
| **De-escalation Speed** | 25–35 min screaming & door slamming | 3–8 min crying into safety on the floor |
| **Self-Regulation Tool** | None (felt paralyzed, yelled) | Successfully executed 3-second somatic pause twice |

**Summary**: The mother has progressed from theoretical knowledge to active somatic execution under pressure. Verbal over-functioning is reducing, though evening fatigue remains the primary vulnerability.`,
          followUps: [
            'What should our primary focus be for Session #3?',
            'Draft a message celebrating this progress for the parent',
          ],
        };
      } else {
        return {
          content: `This is **Session #1** on file for ${session.clientName}. 

The initial baseline indicates:
- **Baseline Stress**: ${session.emotionalObservations.parentalStressLevel}
- **Nervous System Profile**: ${session.emotionalObservations.nervousSystemState.replace(/_/g, ' ')}
- **Key Vulnerability**: Verbal over-functioning during peak child overwhelm.

As subsequent sessions are completed and transcribed, I will automatically populate longitudinal progress trajectories.`,
          followUps: [
            'What are the highest priority action items from this intake?',
            'Draft a welcome and reinforcement WhatsApp message',
          ],
        };
      }
    }

    // Default / General query
    return {
      content: `In reviewing the transcript and clinical notes for **${session.clientName}** (Session #${session.sessionNumber}):

- **Clinical Focus**: ${session.focusAreas.join(' • ')}
- **Current Observation**: ${session.emotionalObservations.childDynamicsSummary || 'High sensory sensitivity and autonomic reactivity during task transitions.'}
- **Immediate Priority**: ${session.actionItems[0]?.text || 'Somatic co-regulation prior to setting cognitive demands.'}

Would you like me to formulate a specific psychoeducational reflection, analyze another pattern from the dialogue, or prepare a client follow-up?`,
      followUps: [
        'Draft a supportive WhatsApp follow-up with the action items',
        'Summarize emotional triggers from this session',
      ],
    };
  };

  // Send message handler
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isGenerating) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        sessionId: session.id,
        clientId: session.clientId,
        sender: 'admin',
        content: text.trim(),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);
      setError(null);

      if (isMockMode) {
        // Realistic simulated typing delay (650ms)
        setTimeout(() => {
          const response = generateMockGeminiResponse(text);
          const geminiMessage: ChatMessage = {
            id: `gemini-${Date.now()}`,
            sessionId: session.id,
            clientId: session.clientId,
            sender: 'gemini',
            content: response.content,
            createdAt: new Date().toISOString(),
            suggestedFollowUps: response.followUps,
          };

          setMessages((prev) => [...prev, geminiMessage]);
          setIsGenerating(false);
        }, 650);
      } else {
        // Future production path: Supabase Edge Function call
        try {
          // Prepared invocation:
          // const { data, error: fnErr } = await supabase.functions.invoke('session-gemini-chat', {
          //   body: { sessionId: session.id, message: text, clientId: session.clientId },
          // });
          // if (fnErr) throw fnErr;
          setIsGenerating(false);
        } catch (err: any) {
          setError(err.message || 'Failed to generate response from Gemini.');
          setIsGenerating(false);
        }
      }
    },
    [session, allClientSessions, isGenerating, isMockMode]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isGenerating,
    error,
    isMockMode,
    setIsMockMode,
    sendMessage,
    clearChat,
  };
}
