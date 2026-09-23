import type { ClientSessionSummary } from '../types/session';

export const MOCK_CLIENT_SESSIONS: ClientSessionSummary[] = [
  // 1. Sarah Jenkins (b17aad0f-9f10-4130-850a-ebbe8d7adc3d) - Leo (3.5y)
  {
    clientId: 'b17aad0f-9f10-4130-850a-ebbe8d7adc3d',
    clientName: 'Sarah Jenkins',
    clientEmail: 'sarah.jenkins@demo-family.test',
    phone: '+201005551201',
    childName: 'Leo Jenkins',
    childAge: '3.5 years',
    totalSessions: 2,
    sessions: [
      {
        id: '1e86592f-ac3a-4e95-9c81-bbc58c68320d',
        bookingId: 'book-sarah-02',
        clientId: 'b17aad0f-9f10-4130-850a-ebbe8d7adc3d',
        clientName: 'Sarah Jenkins',
        clientEmail: 'sarah.jenkins@demo-family.test',
        sessionNumber: 2,
        sessionDate: '2026-09-19T15:00:00Z',
        durationMinutes: 50,
        googleMeetUrl: 'https://meet.google.com/abc-mnop-xyz',
        focusAreas: ['Toddler Meltdowns', 'Somatic Co-regulation', 'Evening Mealtime Resistance'],
        status: 'completed',
        createdAt: '2026-09-19T15:05:00Z',
        updatedAt: '2026-09-19T15:10:00Z',
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
          'Leo responds positively to tactile grounding and heavy work transitions.',
        ],
        actionItems: [
          {
            id: 'act-s2-1',
            text: 'Set up a 15-minute low-demand "Sensory Landing Pad" directly after daycare pick-up before dinner.',
            category: 'parent',
            completed: false,
            priority: 'high',
            contextNote: 'Dim lighting, weighted lap pad, or floor play before transitioning to the kitchen.',
          },
          {
            id: 'act-s2-2',
            text: 'Use the "Drop and Anchor" somatic posture (sit on the floor, 2 feet away, open hands) when Leo yells.',
            category: 'parent',
            completed: true,
            priority: 'high',
            contextNote: 'Replaces verbal explanations during sympathetic arousal.',
          },
          {
            id: 'act-s2-3',
            text: 'Track bedtime meltdowns in a 3-day sensory log to identify auditory vs. tactile triggers.',
            category: 'parent',
            completed: false,
            priority: 'medium',
            contextNote: 'Record time, trigger, and duration.',
          },
          {
            id: 'act-s2-4',
            text: 'Send Mai the sensory regulation PDF worksheet on daycare-to-home transitions.',
            category: 'coach',
            completed: true,
            priority: 'high',
            contextNote: 'Dispatched via WhatsApp CRM nurture.',
          },
        ],
        emotionalObservations: {
          parentalStressLevel: 'moderate',
          nervousSystemState: 'fluctuating',
          identifiedTriggers: [
            'Daycare-to-home evening transition (5:30 PM - 6:30 PM)',
            'Utensil throwing and food refusal at dinner table',
            'Time pressure when preparing meals while managing demands',
          ],
          strengthsNoted: [
            'Exceptional reflective capacity and genuine empathy for child',
            'Diligent implementation of previously agreed somatic pauses',
            'Willingness to examine own nervous system activation',
          ],
          childDynamicsSummary:
            'Leo demonstrates sensory sensitivity to ambient noise and rapid task transitions. Seeks heavy proprioceptive input when distressed.',
        },
        rawTranscript: [
          {
            id: 'utt-1',
            timestamp: '00:45',
            speaker: 'Mai (Coach)',
            text: "Welcome back, Sarah. It's so good to see you again. Before we dive into the logs, take a breath. How is your nervous system feeling right now?",
          },
          {
            id: 'utt-2',
            timestamp: '01:20',
            speaker: 'Parent',
            text: 'Honestly Mai, better than last week, but yesterday was hard. Around 5:30 PM when we came home from daycare, Leo just completely unraveled because the green cup was in the dishwasher.',
          },
          {
            id: 'utt-3',
            timestamp: '03:10',
            speaker: 'Mai (Coach)',
            text: 'The green cup. Remember what we talked about—the green cup is rarely about the cup. What was his sensory environment for the previous 7 hours?',
          },
          {
            id: 'utt-4',
            timestamp: '04:05',
            speaker: 'Parent',
            text: 'Right! He was in a bright classroom with 16 other toddlers. He held it together all day. And then he walked into our house and I immediately asked him to wash his hands and sit at the table.',
          },
          {
            id: 'utt-5',
            timestamp: '05:40',
            speaker: 'Mai (Coach)',
            text: 'Exactly. His nervous system cup was overflowing, and the demand was the final drop. What did you do with your body when he started throwing his shoes?',
          },
          {
            id: 'utt-6',
            timestamp: '06:30',
            speaker: 'Parent',
            text: "I actually remembered the 3-second pause! I stopped in the hallway, put my hand on my chest, exhaled, and instead of saying 'Leo, stop that right now,' I just sat down on the rug with my back against the wall.",
          },
          {
            id: 'utt-7',
            timestamp: '07:55',
            speaker: 'Mai (Coach)',
            text: 'That is huge, Sarah! That is real somatic co-regulation in practice. How did he respond?',
          },
          {
            id: 'utt-8',
            timestamp: '08:45',
            speaker: 'Parent',
            text: "He screamed for another three minutes, but then he came over and shoved his face into my lap. He didn't hit or bite this time. He just sobbed, and I held him until he relaxed.",
          },
          {
            id: 'utt-9',
            timestamp: '11:15',
            speaker: 'Mai (Coach)',
            text: 'Notice that: from 30 minutes of destructive rage down to 3 minutes of crying into safety. Crying is release; rage was defense. That means your grounded presence signaled safety to his amygdala.',
          },
        ],
      },
      {
        id: 'cfd871f7-0c1c-4736-bd4e-358cfc6bc27a',
        bookingId: 'book-sarah-01',
        clientId: 'b17aad0f-9f10-4130-850a-ebbe8d7adc3d',
        clientName: 'Sarah Jenkins',
        clientEmail: 'sarah.jenkins@demo-family.test',
        sessionNumber: 1,
        sessionDate: '2026-09-08T15:00:00Z',
        durationMinutes: 50,
        googleMeetUrl: 'https://meet.google.com/abc-mnop-xyz',
        focusAreas: ['Intake & Assessment', 'Nervous System Fundamentals', 'Maternal Burnout'],
        status: 'completed',
        createdAt: '2026-09-08T15:10:00Z',
        updatedAt: '2026-09-08T15:15:00Z',
        clinicalSummary: `### Initial Intake & Assessment
Sarah attended initial consultation presenting with chronic parental exhaustion, feelings of guilt surrounding reactivity, and distress over Leo's explosive tantrums (ages 3.5). 

### Assessment Findings
- Chronic autonomic sympathetic activation (shallow breathing, clenched jaw, racing thoughts).
- High cognitive overload; Sarah consumes extensive parenting literature but experiences paralysis during actual dysregulation events.
- Introduced foundational psychoeducation: Polyvagal theory, window of tolerance, and the physiological difference between defiance and dysregulation.`,
        keyInsights: [
          'Parental guilt is driving over-verbalization and inconsistent boundary enforcement.',
          'Mother requires practical, physical anchors rather than more cognitive theories.',
          'High baseline stress requires micro-moments of parental self-regulation.',
        ],
        actionItems: [
          {
            id: 'act-s1-1',
            text: 'Practice the 3-second somatic pause twice daily before entering reactive situations.',
            category: 'parent',
            completed: true,
            priority: 'high',
          },
          {
            id: 'act-s1-2',
            text: 'Eliminate post-tantrum logic lectures; replace with 10 minutes of silent connection.',
            category: 'parent',
            completed: true,
            priority: 'high',
          },
        ],
        emotionalObservations: {
          parentalStressLevel: 'elevated',
          nervousSystemState: 'sympathetic_fight_or_flight',
          identifiedTriggers: ['Bedtime delays', 'Aggression toward family dog', 'Public tantrums at grocery store'],
          strengthsNoted: ['Deep emotional devotion', 'Openness to physiological coaching'],
        },
        rawTranscript: [
          {
            id: 'utt-s1-1',
            timestamp: '02:10',
            speaker: 'Mai (Coach)',
            text: 'Sarah, thank you for being here. In our first session, there is no judgment. Tell me what brought you to reaching out.',
          },
          {
            id: 'utt-s1-2',
            timestamp: '03:45',
            speaker: 'Parent',
            text: "I feel like I'm failing Leo. I read every respectful parenting book, but when he screams, I lose my patience and yell, and then I spend the whole night crying in bed.",
          },
        ],
      },
    ],
  },

  // 2. Amina Farouk (7a1449ee-2e1e-4339-9123-cdfd3887469b) - Yousef (6y)
  {
    clientId: '7a1449ee-2e1e-4339-9123-cdfd3887469b',
    clientName: 'Amina Farouk',
    clientEmail: 'amina.farouk@demo-family.test',
    phone: '+201005551202',
    childName: 'Yousef Farouk',
    childAge: '6 years',
    totalSessions: 2,
    sessions: [
      {
        id: '152c5155-afa8-474e-85ee-70d3536ca6f1',
        bookingId: 'book-amina-02',
        clientId: '7a1449ee-2e1e-4339-9123-cdfd3887469b',
        clientName: 'Amina Farouk',
        clientEmail: 'amina.farouk@demo-family.test',
        sessionNumber: 2,
        sessionDate: '2026-09-15T15:00:00Z',
        durationMinutes: 50,
        googleMeetUrl: 'https://meet.google.com/farouk-sess-02',
        focusAreas: ['Bedtime Sequence Review', 'Parental Consistency on Solo Nights', 'Separation Anxiety'],
        status: 'completed',
        createdAt: '2026-09-15T16:00:00Z',
        updatedAt: '2026-09-15T16:15:00Z',
        clinicalSummary: `### Bedtime Routine Adherence & Parental Consistency
Sequence held well on nights both parents were consistent — bedtime down to ~35 minutes on average (from 60-75 minutes previously). Broke down on the two nights Omar was traveling and Amina reverted to old patterns out of sheer exhaustion.

### Clinical Assessment & Next Steps
- This is expected and not a failure; consistency takes longer to build on solo nights.
- Discussed a "tired pass" permission: Amina can shorten the story but must not abandon the sequence entirely.
- Provided tangible connection anchor for Yousef to hold when father travels.`,
        keyInsights: [
          'Fixed visual sequence reduced bedtime negotiation from 75 minutes to 35 minutes on joint nights.',
          'Solo caregiving nights trigger parental fatigue, leading to boundary collapse.',
          'Shortened sequence protocol preserves structure without over-taxing tired mother.',
        ],
        actionItems: [
          {
            id: 'act-am2-1',
            text: 'Use the "Tired Pass" protocol on solo nights: shorten each step to 5 minutes, do not negotiate extra steps.',
            category: 'parent',
            completed: false,
            priority: 'high',
          },
          {
            id: 'act-am2-2',
            text: 'Have Omar record a 2-minute bedtime voice note for Yousef to play on nights he travels.',
            category: 'parent',
            completed: true,
            priority: 'high',
          },
        ],
        emotionalObservations: {
          parentalStressLevel: 'moderate',
          nervousSystemState: 'fluctuating',
          identifiedTriggers: ['Work travel nights', '8:15 PM stall tactics ("one more water")', 'Parental fatigue'],
          strengthsNoted: ['Willingness to track data honestly', 'Open communication between partners'],
          childDynamicsSummary: 'Yousef tests boundaries when routines fluctuate; thrives with predictable visual schedules.',
        },
        rawTranscript: [
          {
            id: 'utt-af2-1',
            timestamp: '01:05',
            speaker: 'Mai (Coach)',
            text: "Amina, Omar, great to see you both again. Let's see how the bedtime sequence held up over the last two weeks.",
          },
          {
            id: 'utt-af2-2',
            timestamp: '01:50',
            speaker: 'Parent',
            text: "On the nights Omar was home, it was incredible—lights out in 35 minutes! But on Tuesday when Omar had to fly to Dubai, I was so depleted I just let him watch videos in my bed.",
          },
          {
            id: 'utt-af2-3',
            timestamp: '03:15',
            speaker: 'Mai (Coach)',
            text: "That makes complete sense. When you're solo and exhausted, high-demand enforcement isn't sustainable. That's why we build a 'Tired Pass' version of the routine.",
          },
        ],
      },
      {
        id: 'f0baecf5-a890-4124-a678-446939871de8',
        bookingId: 'book-amina-01',
        clientId: '7a1449ee-2e1e-4339-9123-cdfd3887469b',
        clientName: 'Amina Farouk',
        clientEmail: 'amina.farouk@demo-family.test',
        sessionNumber: 1,
        sessionDate: '2026-09-01T15:00:00Z',
        durationMinutes: 50,
        googleMeetUrl: 'https://meet.google.com/farouk-sess-01',
        focusAreas: ['Bedtime Negotiation Intake', 'Co-Parenting Alignment', 'Visual Schedules'],
        status: 'completed',
        createdAt: '2026-09-01T16:00:00Z',
        updatedAt: '2026-09-01T16:10:00Z',
        clinicalSummary: `### Joint Intake Session: Bedtime Friction
Joint session with both parents. Bedtime currently starts around 8:00 PM and often doesn't end until 9:00-9:15 PM, with Yousef renegotiating every step ("one more book," "I need water," "stay until I'm asleep").

### Dynamics & Interventions
- Amina reports she is the one who eventually caves most nights out of exhaustion.
- Omar is stricter but is only home 4-5 nights a week, creating an inconsistency Yousef has learned to exploit.
- Recommended a fixed visual sequence with both parents scripting identically word-for-word.`,
        keyInsights: [
          'Inconsistency between traveling father and solo mother drives nightly boundary testing.',
          'Child is not manipulating; child is seeking certainty about where the true boundary lies.',
          'Visual sequence provides objective external structure that neither parent needs to argue over.',
        ],
        actionItems: [
          {
            id: 'act-am1-1',
            text: 'Hang the 4-step visual bedtime chart in Yousef’s bedroom at child eye level.',
            category: 'parent',
            completed: true,
            priority: 'high',
          },
          {
            id: 'act-am1-2',
            text: 'Use the exact phrase: "The chart says it is time for book. We have one book tonight."',
            category: 'parent',
            completed: true,
            priority: 'high',
          },
        ],
        emotionalObservations: {
          parentalStressLevel: 'elevated',
          nervousSystemState: 'dorsal_vagal_shutdown',
          identifiedTriggers: ['Bedtime start announcement', 'Father leaving on business trips', 'Prolonged stalls'],
          strengthsNoted: ['Both parents attended together', 'Deep mutual respect'],
        },
        rawTranscript: [
          {
            id: 'utt-af1-1',
            timestamp: '00:05',
            speaker: 'Mai (Coach)',
            text: 'Walk me through what a typical bedtime looks like, start to finish.',
          },
          {
            id: 'utt-af1-2',
            timestamp: '00:20',
            speaker: 'Parent',
            text: "Bath around 7:45, then it just... unravels. He'll ask for water, then a different book, then he wants me to lie down with him.",
          },
          {
            id: 'utt-af1-3',
            timestamp: '00:48',
            speaker: 'Mai (Coach)',
            text: 'And when Omar is home, is it different?',
          },
          {
            id: 'utt-af1-4',
            timestamp: '01:02',
            speaker: 'Parent',
            text: "I try to be firmer but I'm not always sure what she's already agreed to, so I end up either overriding her or letting it slide.",
          },
        ],
      },
    ],
  },

  // 3. Mona Hassan (a37fc9dd-1891-4692-8e83-f80c7007e27e) - Farida (5y) & Adam (2y)
  {
    clientId: 'a37fc9dd-1891-4692-8e83-f80c7007e27e',
    clientName: 'Mona Hassan',
    clientEmail: 'mona.hassan@demo-family.test',
    phone: '+201005551204',
    childName: 'Farida & Adam Hassan',
    childAge: '5 & 2 years',
    totalSessions: 2,
    sessions: [
      {
        id: 'd478d43c-e3df-450f-b55c-0da81b638ccc',
        bookingId: 'book-mona-02',
        clientId: 'a37fc9dd-1891-4692-8e83-f80c7007e27e',
        clientName: 'Mona Hassan',
        clientEmail: 'mona.hassan@demo-family.test',
        sessionNumber: 2,
        sessionDate: '2026-09-06T15:00:00Z',
        durationMinutes: 50,
        googleMeetUrl: 'https://meet.google.com/hassan-sess-02',
        focusAreas: ['One-on-One Attachment Time Results', 'Sibling Conflict Threshold', 'Parental De-escalation'],
        status: 'completed',
        createdAt: '2026-09-06T16:00:00Z',
        updatedAt: '2026-09-06T16:15:00Z',
        clinicalSummary: `### Sibling Conflict Review & One-on-One Results
Mona reports the dedicated one-on-one time (15 min/day where Farida picks the activity) has been the single biggest shift. Hitting incidents dropped from several times daily down to roughly 3-4 times per week.

### Assessment & Maintenance
Karim still intervenes faster than the plan calls for but is increasingly self-correcting. Given the marked stability, regular sessions are paused with option for as-needed check-ins.`,
        keyInsights: [
          '15 minutes of uninterrupted 1-on-1 maternal time satisfied Farida’s attachment hunger.',
          'Sibling aggression reduced by >60% after parental refereeing was discontinued.',
        ],
        actionItems: [
          {
            id: 'act-mh2-1',
            text: 'Protect the daily 15-minute 1-on-1 window for Farida as non-negotiable.',
            category: 'parent',
            completed: true,
            priority: 'high',
          },
        ],
        emotionalObservations: {
          parentalStressLevel: 'low',
          nervousSystemState: 'regulated_ventral',
          identifiedTriggers: ['Toy grabbing at transition hours'],
          strengthsNoted: ['Remarkable consistency in protecting child-led connection time'],
        },
        rawTranscript: [
          {
            id: 'utt-mh2-1',
            timestamp: '00:30',
            speaker: 'Mai (Coach)',
            text: "Mona, Karim, welcome back. Tell me about the 1-on-1 time experiments with Farida.",
          },
          {
            id: 'utt-mh2-2',
            timestamp: '01:10',
            speaker: 'Parent',
            text: "It was like night and day. She started asking for 'our special 15 minutes' right after naptime, and the hitting almost disappeared!",
          },
        ],
      },
      {
        id: 'b67f789d-23a4-4e66-9811-26180fd16ca2',
        bookingId: 'book-mona-01',
        clientId: 'a37fc9dd-1891-4692-8e83-f80c7007e27e',
        clientName: 'Mona Hassan',
        clientEmail: 'mona.hassan@demo-family.test',
        sessionNumber: 1,
        sessionDate: '2026-08-23T15:00:00Z',
        durationMinutes: 50,
        googleMeetUrl: 'https://meet.google.com/hassan-sess-01',
        focusAreas: ['Sibling Conflict Intake', 'Attention Shifting Dynamics', 'Narrate Don’t Referee'],
        status: 'completed',
        createdAt: '2026-08-23T16:00:00Z',
        updatedAt: '2026-08-23T16:15:00Z',
        clinicalSummary: `### Joint Intake: Escalating Sibling Friction
Both parents present. Conflict pattern: Adam grabs/approaches Farida's toys, Farida reacts by hitting or shoving, one or both parents intervene immediately and inconsistently.

### Core Recommendations
- Adopt a "Narrate, Don't Referee" stance for non-safety disputes.
- Institute 15 minutes of dedicated daily one-on-one time with Farida.`,
        keyInsights: [
          'Farida’s aggression toward younger brother was an SOS signal for exclusive parental attention.',
          'Immediate parental refereeing was accidentally reinforcing the conflict loop.',
        ],
        actionItems: [
          {
            id: 'act-mh1-1',
            text: 'Practice "Narrate, Don\'t Referee": name feelings out loud, only physically step in for safety.',
            category: 'parent',
            completed: true,
            priority: 'high',
          },
        ],
        emotionalObservations: {
          parentalStressLevel: 'elevated',
          nervousSystemState: 'fluctuating',
          identifiedTriggers: ['Toy snatching', 'Dinner preparation hour'],
          strengthsNoted: ['Both parents motivated to unlearn old punitive habits'],
        },
        rawTranscript: [
          {
            id: 'utt-mh1-1',
            timestamp: '00:45',
            speaker: 'Mai (Coach)',
            text: "Welcome Mona and Karim. Sibling tension is so taxing on the home environment. Walk me through a recent flare-up.",
          },
          {
            id: 'utt-mh1-2',
            timestamp: '01:30',
            speaker: 'Parent',
            text: "Adam crawled over and picked up Farida's puzzle piece, and Farida immediately shoved him backwards onto the rug.",
          },
        ],
      },
    ],
  },

  // 4. Laila Nabil (4f1038f4-f9cf-4a0c-acce-75d962ed0b3e) - Nour (8y)
  {
    clientId: '4f1038f4-f9cf-4a0c-acce-75d962ed0b3e',
    clientName: 'Laila Nabil',
    clientEmail: 'laila.nabil@demo-family.test',
    phone: '+201005551203',
    childName: 'Nour Nabil',
    childAge: '8 years',
    totalSessions: 1,
    sessions: [
      {
        id: '85a9653c-57f3-4bcb-a740-cd04c59a6920',
        bookingId: 'book-laila-01',
        clientId: '4f1038f4-f9cf-4a0c-acce-75d962ed0b3e',
        clientName: 'Laila Nabil',
        clientEmail: 'laila.nabil@demo-family.test',
        sessionNumber: 1,
        sessionDate: '2026-09-24T15:00:00Z',
        durationMinutes: 50,
        googleMeetUrl: 'https://meet.google.com/nabil-sess-01',
        focusAreas: ['School Refusal & Morning Anxiety', 'Somatic Stomachaches', 'Academic Transition'],
        status: 'completed',
        createdAt: '2026-09-22T10:00:00Z',
        updatedAt: '2026-09-22T10:15:00Z',
        clinicalSummary: `### Intake & Assessment: School Refusal Behavior
Laila attended presenting with sudden morning school-refusal behavior in 8-year-old Nour, characterized by stomachaches, tearfulness, and extreme reluctance at drop-off beginning three weeks into the term.

### Assessment Findings
- No bullying reported; symptoms coincided with the launch of an advanced reading evaluation program.
- Physical complaints are somatic manifestations of acute anticipatory performance anxiety.
- Laila's verbal reassurances ("You're so smart, you have nothing to worry about") inadvertently heightened pressure.`,
        keyInsights: [
          'Morning stomachaches are real somatic distress, not intentional malingering.',
          'Validating the physical sensation before addressing school departure dissolves the freeze state.',
        ],
        actionItems: [
          {
            id: 'act-ln1-1',
            text: 'Institute the "Warm Belly" grounding protocol: warm water sip and hot water bottle before departure.',
            category: 'parent',
            completed: false,
            priority: 'high',
          },
          {
            id: 'act-ln1-2',
            text: 'Coordinate with classroom teacher for a quiet 5-minute transition helper role upon arrival.',
            category: 'coach',
            completed: true,
            priority: 'medium',
          },
        ],
        emotionalObservations: {
          parentalStressLevel: 'elevated',
          nervousSystemState: 'sympathetic_fight_or_flight',
          identifiedTriggers: ['Morning drop-off curb', 'Reading aloud in class', '7:00 AM alarm'],
          strengthsNoted: ['Deep attunement and protective maternal presence'],
        },
        rawTranscript: [
          {
            id: 'utt-ln1-1',
            timestamp: '00:50',
            speaker: 'Mai (Coach)',
            text: "Hello Laila, thank you for coming in today. Tell me what mornings have felt like since third grade started.",
          },
          {
            id: 'utt-ln1-2',
            timestamp: '01:40',
            speaker: 'Parent',
            text: "Every single day by 7:15 AM she is clutching her stomach crying that she feels sick. The pediatrician checked her and said she is physically healthy.",
          },
        ],
      },
    ],
  },

  // 5. Tamim nabil (92fc6f41-f797-402b-8afe-79671f6e8cb1)
  {
    clientId: '92fc6f41-f797-402b-8afe-79671f6e8cb1',
    clientName: 'Tamim nabil',
    clientEmail: 't.badawi@abrd.com.sa',
    phone: '01005809498',
    childName: 'Nabil',
    childAge: '4 years',
    totalSessions: 1,
    sessions: [
      {
        id: '9f30d3c4-0d20-4323-ab40-57b6cb438dc6',
        bookingId: '9f30d3c4-0d20-4323-ab40-57b6cb438dc6',
        clientId: '92fc6f41-f797-402b-8afe-79671f6e8cb1',
        clientName: 'Tamim nabil',
        clientEmail: 't.badawi@abrd.com.sa',
        sessionNumber: 1,
        sessionDate: '2026-09-17T14:00:00Z',
        durationMinutes: 50,
        googleMeetUrl: 'https://meet.google.com/tamim-consult',
        focusAreas: ['Parent-Child Co-regulation', 'Emotional Expression', 'Screen Time Boundaries'],
        status: 'completed',
        createdAt: '2026-09-17T15:00:00Z',
        updatedAt: '2026-09-17T15:15:00Z',
        clinicalSummary: `### Clinical Consultation & Family Goals
Session focused on establishing structured daily rhythms and reducing screen-transition meltdowns. Client demonstrated exceptional attentiveness to emotional cues and positive openness to implementing sensory co-regulation tools.

### Key Observations
- Transition from afternoon screen time to family dinner is the primary trigger window.
- Recommended a 5-minute tactile countdown activity rather than abrupt verbal cutoff.`,
        keyInsights: [
          'Visual and auditory cues during digital transitions preserve nervous system regulation.',
          'Father is highly proactive and eager to institute family routine cards.',
        ],
        actionItems: [
          {
            id: 'act-tn-1',
            text: 'Introduce a physical chime or timer 5 minutes prior to turning off screens.',
            category: 'parent',
            completed: true,
            priority: 'high',
          },
        ],
        emotionalObservations: {
          parentalStressLevel: 'low',
          nervousSystemState: 'regulated_ventral',
          identifiedTriggers: ['Abrupt screen turn-off', 'Rushing evening routine'],
          strengthsNoted: ['Strong engagement and rapid follow-through on coaching recommendations'],
        },
        rawTranscript: [
          {
            id: 'utt-tn-1',
            timestamp: '00:30',
            speaker: 'Mai (Coach)',
            text: "Welcome Tamim! Let's explore how we can bring more ease to your family's evening transitions.",
          },
          {
            id: 'utt-tn-2',
            timestamp: '01:15',
            speaker: 'Parent',
            text: "Thank you Mai. We notice that whenever it is time to turn off the iPad, there is immediate resistance.",
          },
        ],
      },
    ],
  },
];
