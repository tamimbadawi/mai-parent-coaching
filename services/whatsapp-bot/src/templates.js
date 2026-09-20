/**
 * Decoupled WhatsApp message templates for Mai Parent Coaching.
 *
 * Brand Positioning:
 * - Evidence-based parenting support
 * - Burnout recovery & nervous system healing
 * - Calm, warm, trustworthy, professional
 */

const TEMPLATES = {
  welcome: {
    name: 'welcome',
    description: 'Welcome greeting sent to newly registered or approved clients',
    requiredParams: ['parentName'],
    optionalParams: ['coachName'],
    render: (params) => {
      const coach = params.coachName || 'Mai';
      return `Hello ${params.parentName},\n\nWelcome to Mai's Parent Coaching. I am truly glad you are here. My focus is to offer you a calm, evidence-based, and compassionate space for your family's parenting journey.\n\nFeel free to reply to this number whenever you need guidance or have a question.\n\nWarmly,\n${coach}`;
    }
  },

  booking_confirmation: {
    name: 'booking_confirmation',
    description: 'Appointment confirmation with session date, time, and meeting link',
    requiredParams: ['parentName', 'appointmentType', 'date', 'time', 'meetingLink'],
    optionalParams: ['timezone'],
    render: (params) => {
      const tz = params.timezone ? ` (${params.timezone})` : '';
      return `Dear ${params.parentName},\n\nYour coaching session for *${params.appointmentType}* has been confirmed.\n\n🗓 *Date:* ${params.date}\n⏰ *Time:* ${params.time}${tz}\n🔗 *Meeting Link:* ${params.meetingLink}\n\nPlease take a few moments before our call to be in a quiet, comfortable space. If you need to reschedule or have questions beforehand, simply reply to this message.\n\nLooking forward to speaking with you,\nMai`;
    }
  },

  reminder_24h: {
    name: 'reminder_24h',
    description: 'Pre-session reminder dispatched 24 hours prior to appointment',
    requiredParams: ['parentName', 'appointmentType', 'time', 'meetingLink'],
    optionalParams: ['timezone'],
    render: (params) => {
      const tz = params.timezone ? ` (${params.timezone})` : '';
      return `Hi ${params.parentName},\n\nThis is a gentle reminder that your session for *${params.appointmentType}* is scheduled for tomorrow at *${params.time}${tz}*.\n\n🔗 *Meeting Link:* ${params.meetingLink}\n\nTake a deep breath and give yourself credit for showing up for yourself and your family. See you tomorrow!\n\nWarm regards,\nMai`;
    }
  },

  reminder_1h: {
    name: 'reminder_1h',
    description: 'Pre-session reminder dispatched 1 hour prior to appointment',
    requiredParams: ['parentName', 'appointmentType', 'meetingLink'],
    optionalParams: [],
    render: (params) => {
      return `Hi ${params.parentName},\n\nOur session (*${params.appointmentType}*) starts in approximately 1 hour.\n\nGrab a warm drink, make yourself comfortable, and click here when ready to join:\n🔗 ${params.meetingLink}\n\nSee you shortly,\nMai`;
    }
  },

  post_session_followup: {
    name: 'post_session_followup',
    description: 'Check-in dispatched 24-48 hours post-session with feedback link',
    requiredParams: ['parentName'],
    optionalParams: ['feedbackLink', 'notes'],
    render: (params) => {
      let message = `Dear ${params.parentName},\n\nThank you for sharing your time and vulnerability during our session. Remember that meaningful change happens one small, patient moment at a time.`;

      if (params.notes) {
        message += `\n\n📌 *Key Takeaway:* ${params.notes}`;
      }

      if (params.feedbackLink) {
        message += `\n\nWhen you have a quiet moment, I would love to hear how the session felt for you:\n🔗 ${params.feedbackLink}`;
      }

      message += `\n\nWishing you a grounded and calm day ahead.\n\nWith care,\nMai`;
      return message;
    }
  }
};

/**
 * Render a template by name with provided parameters.
 * Throws a descriptive error if template is unknown or required parameters are missing.
 *
 * @param {string} templateName
 * @param {object} params
 * @returns {string} Rendered message text
 */
function renderTemplate(templateName, params = {}) {
  const template = TEMPLATES[templateName];
  if (!template) {
    const available = Object.keys(TEMPLATES).join(', ');
    throw new Error(`Unknown template "${templateName}". Available templates: ${available}`);
  }

  const missing = [];
  for (const required of template.requiredParams) {
    if (params[required] === undefined || params[required] === null || params[required] === '') {
      missing.push(required);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required parameter(s) for template "${templateName}": ${missing.join(', ')}`);
  }

  return template.render(params);
}

/**
 * Get public catalog of templates and their required/optional parameters.
 */
function getTemplateCatalog() {
  return Object.entries(TEMPLATES).map(([key, t]) => ({
    key,
    name: t.name,
    description: t.description,
    requiredParams: t.requiredParams,
    optionalParams: t.optionalParams,
  }));
}

module.exports = {
  TEMPLATES,
  renderTemplate,
  getTemplateCatalog,
};
