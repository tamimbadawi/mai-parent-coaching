import type { ClientSessionSummary, SessionTranscript } from '../types/session';

export const MOCK_CLIENT_SESSIONS: ClientSessionSummary[] = [
  {
    clientId: 'client-sarah-jenkins',
    clientName: 'Sarah Jenkins',
    clientEmail: 'sarah.j@example.com',
    phone: '+1 (555) 349-8201',
    childName: 'Leo',
    childAge: '3.5 years',
    totalSessions: 2,
    sessions: [
      {
        id: 'sess-sarah-02',
        bookingId: 'book-sarah-02',
        clientId: 'client-sarah-jenkins',
        clientName: 'Sarah Jenkins',
        clientEmail: 'sarah.j@example.com',
        sessionNumber: 2,
        sessionDate: '2026-09-18T14:00:00Z',
        durationMinutes: 50,
        googleMeetUrl: 'https://meet.google.com/abc-mnop-xyz',
        focusAreas: ['Toddler Meltdowns', 'Somatic Co-regulation', 'Evening Mealtime Resistance'],
        status: 'completed',
        createdAt: '2026-09-18T15:05:00Z',
        updatedAt: '2026-09-18T15:10:00Z',
        clinicalSummary: `### Executive Clinical Summary
Sarah reported observable reduction in the **frequency** of evening dysregulation episodes following the implementation of the *3-Second Somatic Pause* introduced in Session #1. However, peak intensity remains elevated specifically between **5:30 PM – 6:30 PM (the transition window from daycare to dinner)**.

### Core Behavioral & Relational Dynamics
1. **Sensory Depletion at Transition**: Leo arrives home in a state of sensory exhaustion (*allostatic overload*). Demanding cognitive compliance (e.g., wash hands, sit upright, eat vegetables) immediately triggers a fight-or-flight defensive response.
2. **Parental Mirroring & Contagion**: Sarah noted that her own blood pressure spikes when Leo throws utensils. Her instinct is verbal lecturing (*verbal over-functioning*), which floods Leo's already overwhelmed nervous system.
3. **Progress Milestone**: Sarah successfully paused twice this week without yelling, allowing Leo to de-escalate on the living room carpet within 8 minutes instead of 30+ minutes.

### Key Clinical Recommendations
- **Transition Buffer ("Sensory Landing Pad")**: Institute a 15-minute low-demand sensory decompression protocol immediately upon arriving home (heavy work, quiet dim room, cold water sip) before placing any dinner expectations.
- **De-escalation Posture**: Move down to Leo's eye level, reduce verbal output by 80%, and prioritize physical grounding over explanatory logic during high dysregulation.`,
        keyInsights: [
          'Meltdowns are predictable sensory overload reactions, not willful disobedience.',
          'Parental verbal explanation during peak dysregulation prolongs tantrums by 3x.',
          'The 3-Second Pause is actively developing maternal somatic self-awareness.',
          'Leo responds positively to tactile grounding and heavy work transitions.'
        ],
        actionItems: [
          {
            id: 'act-s2-1',
            text: 'Set up a 15-minute low-demand "Sensory Landing Pad" directly after daycare pick-up before dinner.',
            category: 'parent',
            completed: false,
            priority: 'high',
            contextNote: 'Dim lighting, weighted lap pad, or floor play before transitioning to the kitchen.'
          },
          {
            id: 'act-s2-2',
            text: 'Use the "Drop and Anchor" somatic posture (sit on the floor, 2 feet away, open hands) when Leo yells.',
            category: 'parent',
            completed: true,
            priority: 'high',
            contextNote: 'Replaces verbal explanations during sympathetic arousal.'
          },
          {
            id: 'act-s2-3',
            text: 'Track bedtime meltdowns in a 3-day sensory log to identify auditory vs. tactile triggers.',
            category: 'parent',
            completed: false,
            priority: 'medium',
            contextNote: 'Record time, trigger, and duration.'
          },
          {
            id: 'act-s2-4',
            text: 'Send Mai the sensory regulation PDF worksheet on daycare-to-home transitions.',
            category: 'coach',
            completed: true,
            priority: 'high',
            contextNote: 'Dispatched via WhatsApp CRM nurture.'
          }
        ],
        emotionalObservations: {
          parentalStressLevel: 'moderate',
          nervousSystemState: 'fluctuating',
          identifiedTriggers: [
            'Daycare-to-home evening transition (5:30 PM - 6:30 PM)',
            'Utensil throwing and food refusal at dinner table',
            'Time pressure when preparing meals while managing demands'
          ],
          strengthsNoted: [
            'Exceptional reflective capacity and genuine empathy for child',
            'Diligent implementation of previously agreed somatic pauses',
            'Willingness to examine own nervous system activation'
          ],
          childDynamicsSummary: 'Leo demonstrates sensory sensitivity to ambient noise and rapid task transitions. Seeks heavy proprioceptive input when distressed.'
        },
        rawTranscript: [
          {
            id: 'utt-1',
            timestamp: '00:45',
            speaker: 'Mai (Coach)',
            text: "Welcome back, Sarah. It's so good to see you again. Before we dive into the logs, take a breath. How is your nervous system feeling right now?"
          },
          {
            id: 'utt-2',
            timestamp: '01:20',
            speaker: 'Parent',
            text: "Honestly Mai, better than last week, but yesterday was hard. Around 5:30 PM when we came home from daycare, Leo just completely unraveled because the green cup was in the dishwasher."
          },
          {
            id: 'utt-3',
            timestamp: '03:10',
            speaker: 'Mai (Coach)',
            text: "The green cup. Remember what we talked about—the green cup is rarely about the cup. What was his sensory environment for the previous 7 hours?"
          },
          {
            id: 'utt-4',
            timestamp: '04:05',
            speaker: 'Parent',
            text: "Right! He was in a bright classroom with 16 other toddlers. He held it together all day. And then he walked into our house and I immediately asked him to wash his hands and sit at the table."
          },
          {
            id: 'utt-5',
            timestamp: '05:40',
            speaker: 'Mai (Coach)',
            text: "Exactly. His nervous system cup was overflowing, and the demand was the final drop. What did you do with your body when he started throwing his shoes?"
          },
          {
            id: 'utt-6',
            timestamp: '06:30',
            speaker: 'Parent',
            text: "I actually remembered the 3-second pause! I stopped in the hallway, put my hand on my chest, exhaled, and instead of saying 'Leo, stop that right now,' I just sat down on the rug with my back against the wall."
          },
          {
            id: 'utt-7',
            timestamp: '07:55',
            speaker: 'Mai (Coach)',
            text: "That is huge, Sarah! That is real somatic co-regulation in practice. How did he respond?"
          },
          {
            id: 'utt-8',
            timestamp: '08:45',
            speaker: 'Parent',
            text: "He screamed for another three minutes, but then he came over and shoved his face into my lap. He didn't hit or bite this time. He just sobbed, and I held him until he relaxed."
          },
          {
            id: 'utt-9',
            timestamp: '11:15',
            speaker: 'Mai (Coach)',
            text: "Notice that: from 30 minutes of destructive rage down to 3 minutes of crying into safety. Crying is release; rage was defense. That means your grounded presence signaled safety to his amygdala."
          }
        ]
      },
      {
        id: 'sess-sarah-01',
        bookingId: 'book-sarah-01',
        clientId: 'client-sarah-jenkins',
        clientName: 'Sarah Jenkins',
        clientEmail: 'sarah.j@example.com',
        sessionNumber: 1,
        sessionDate: '2026-09-04T14:00:00Z',
        durationMinutes: 55,
        googleMeetUrl: 'https://meet.google.com/abc-mnop-xyz',
        focusAreas: ['Intake & Assessment', 'Nervous System Fundamentals', 'Maternal Burnout'],
        status: 'completed',
        createdAt: '2026-09-04T15:10:00Z',
        updatedAt: '2026-09-04T15:15:00Z',
        clinicalSummary: `### Initial Intake & Assessment
Sarah attended initial consultation presenting with chronic parental exhaustion, feelings of guilt surrounding reactivity, and distress over Leo's explosive tantrums (ages 3.5). 

### Assessment Findings
- Chronic autonomic sympathetic activation (shallow breathing, clenched jaw, racing thoughts).
- High cognitive overload; Sarah consumes extensive parenting literature but experiences paralysis during actual dysregulation events.
- Introduced foundational psychoeducation: Polyvagal theory, window of tolerance, and the physiological difference between defiance and dysregulation.`,
        keyInsights: [
          'Parental guilt is driving over-verbalization and inconsistent boundary enforcement.',
          'Mother requires practical, physical anchors rather than more cognitive theories.',
          'High baseline stress requires micro-moments of parental self-regulation.'
        ],
        actionItems: [
          {
            id: 'act-s1-1',
            text: 'Practice the 3-second somatic pause twice daily before entering reactive situations.',
            category: 'parent',
            completed: true,
            priority: 'high'
          },
          {
            id: 'act-s1-2',
            text: 'Eliminate post-tantrum logic lectures; replace with 10 minutes of silent connection.',
            category: 'parent',
            completed: true,
            priority: 'high'
          }
        ],
        emotionalObservations: {
          parentalStressLevel: 'elevated',
          nervousSystemState: 'sympathetic_fight_or_flight',
          identifiedTriggers: ['Bedtime delays', 'Aggression toward family dog', 'Public tantrums at grocery store'],
          strengthsNoted: ['Deep emotional devotion', 'Openness to physiological coaching']
        },
        rawTranscript: [
          {
            id: 'utt-s1-1',
            timestamp: '02:10',
            speaker: 'Mai (Coach)',
            text: "Sarah, thank you for being here. In our first session, there is no judgment. Tell me what brought you to reaching out."
          },
          {
            id: 'utt-s1-2',
            timestamp: '03:45',
            speaker: 'Parent',
            text: "I feel like I'm failing Leo. I read every respectful parenting book, but when he screams, I lose my patience and yell, and then I spend the whole night crying in bed."
          }
        ]
      }
    ]
  },
  {
    clientId: 'client-david-vance',
    clientName: 'David & Elena Vance',
    clientEmail: 'vance.family@example.com',
    phone: '+44 7700 900142',
    childName: 'Maya',
    childAge: '5 years',
    totalSessions: 1,
    sessions: [
      {
        id: 'sess-vance-01',
        bookingId: 'book-vance-01',
        clientId: 'client-david-vance',
        clientName: 'David & Elena Vance',
        clientEmail: 'vance.family@example.com',
        sessionNumber: 1,
        sessionDate: '2026-09-17T11:00:00Z',
        durationMinutes: 50,
        googleMeetUrl: 'https://meet.google.com/vance-session-01',
        focusAreas: ['Bedtime Resistance', 'Parental Alignment', 'Separation Anxiety'],
        status: 'completed',
        createdAt: '2026-09-17T12:15:00Z',
        updatedAt: '2026-09-17T12:20:00Z',
        clinicalSummary: `### Bedtime Resistance & Co-Parenting Alignment
David and Elena sought guidance for Maya's bedtime routine, which consistently stretches from 7:30 PM to 10:00 PM with repeated stalling tactics, somatic complaints (tummy aches), and emotional meltdowns when parents attempt to leave the room.

### Observed Dynamics
- **Splitting / Inconsistency**: David enforces strict boundaries while Elena utilizes prolonged negotiation and re-entering the room 5-6 times, creating attachment confusion.
- **Separation Fears vs. Power Struggles**: Maya's behavior is rooted in genuine fear of darkness and solitary transition, compounded by anticipation of parental frustration.
- **Intervention**: Introduced a predictable 4-part Visual Bedtime Flow and a "Bridging the Separation" night routine (tangible connection token).`,
        keyInsights: [
          'Inconsistent bedtime boundaries escalate child anxiety by making separation unpredictable.',
          'Physical connection tokens (e.g. matched heart stones) alleviate nighttime hyper-vigilance.',
          'Parents need a shared script to prevent good-cop / bad-cop triangulation.'
        ],
        actionItems: [
          {
            id: 'act-v1-1',
            text: 'Co-design a pictorial bedtime routine chart with Maya during daylight hours.',
            category: 'parent',
            completed: false,
            priority: 'high'
          },
          {
            id: 'act-v1-2',
            text: 'Implement the "Loving Bridge" token: spray a small cloth with Elena’s perfume for Maya to hold.',
            category: 'parent',
            completed: false,
            priority: 'medium'
          },
          {
            id: 'act-v1-3',
            text: 'Share the Bedtime Visual Routine template with David & Elena.',
            category: 'coach',
            completed: true,
            priority: 'high'
          }
        ],
        emotionalObservations: {
          parentalStressLevel: 'elevated',
          nervousSystemState: 'dorsal_vagal_shutdown',
          identifiedTriggers: ['7:30 PM bedtime announcement', 'Bedtime story finishing', 'Leaving the bedroom door cracked'],
          strengthsNoted: ['Strong collaborative desire between partners', 'Maya is highly imaginative and verbal']
        },
        rawTranscript: [
          {
            id: 'utt-v1',
            timestamp: '01:10',
            speaker: 'Mai (Coach)',
            text: "David and Elena, welcome. Bedtime struggles are often where parental energy is at its thinnest. Walk me through a typical night."
          },
          {
            id: 'utt-v2',
            timestamp: '02:30',
            speaker: 'Parent',
            text: "It takes almost two and a half hours, Mai. David gets frustrated, I get anxious, and Maya senses the tension and clings harder."
          }
        ]
      }
    ]
  },
  {
    clientId: 'client-nour-alsayed',
    clientName: 'Nour Al-Sayed',
    clientEmail: 'nour.alsayed@example.com',
    phone: '+971 50 123 4567',
    childName: 'Zayd',
    childAge: '6 years',
    totalSessions: 1,
    sessions: [
      {
        id: 'sess-nour-03',
        bookingId: 'book-nour-03',
        clientId: 'client-nour-alsayed',
        clientName: 'Nour Al-Sayed',
        clientEmail: 'nour.alsayed@example.com',
        sessionNumber: 3,
        sessionDate: '2026-09-19T09:30:00Z',
        durationMinutes: 45,
        googleMeetUrl: 'https://meet.google.com/nour-session-03',
        focusAreas: ['School Morning Anxiety', 'Sensory Sensitivity', 'Dressing Resistance'],
        status: 'completed',
        createdAt: '2026-09-19T10:35:00Z',
        updatedAt: '2026-09-19T10:40:00Z',
        clinicalSummary: `### School Morning Transitions & Sensory De-escalation
Nour reported dramatic improvements in morning clothing battles after pre-washing school uniforms 3 times and removing tags. However, intense resistance remains at the threshold of the front door at 7:15 AM.

### Clinical Assessment
- Zayd experiences acute morning cortisol spike and anticipatory dread regarding classroom noise and peer dynamics.
- Nour's repeated verbal prompts ("Hurry up or we'll be late") increase Zayd's internal paralysis (*freeze response*).
- Prescribed a "First-Then" sensory sequence and calm regulatory transition handshake.`,
        keyInsights: [
          'Clothing resistance was 90% sensory tactile discomfort, successfully addressed.',
          'Threshold resistance at the front door is social anxiety / peer noise anticipation.',
          'Verbal reminders of time limits activate freeze response in sensory-sensitive children.'
        ],
        actionItems: [
          {
            id: 'act-n3-1',
            text: 'Institute silent visual countdown timer rather than verbal time reminders.',
            category: 'parent',
            completed: false,
            priority: 'high'
          },
          {
            id: 'act-n3-2',
            text: 'Practice the special 3-step grounding handshake at the front door before opening it.',
            category: 'parent',
            completed: true,
            priority: 'medium'
          }
        ],
        emotionalObservations: {
          parentalStressLevel: 'moderate',
          nervousSystemState: 'regulated_ventral',
          identifiedTriggers: ['7:15 AM door threshold departure', 'Car ride audio volume', 'School bell'],
          strengthsNoted: ['Proactive environment restructuring', 'Attentive observer of tactile nuances']
        },
        rawTranscript: [
          {
            id: 'utt-n1',
            timestamp: '00:50',
            speaker: 'Mai (Coach)',
            text: "Good morning Nour! The clothing strategy update you sent on WhatsApp was wonderful to hear."
          },
          {
            id: 'utt-n2',
            timestamp: '01:40',
            speaker: 'Parent',
            text: "Removing the tags and washing the uniforms changed everything! But getting his feet out the front door is our new mountain."
          }
        ]
      }
    ]
  }
];
