const test = require('node:test');
const assert = require('node:assert/strict');
const { renderTemplate, getTemplateCatalog, TEMPLATES } = require('../src/templates');

test('Template System', async (t) => {
  await t.test('catalog returns all registered templates', () => {
    const catalog = getTemplateCatalog();
    assert.equal(Array.isArray(catalog), true);
    assert.equal(catalog.length, Object.keys(TEMPLATES).length);
    assert.ok(catalog.find((c) => c.key === 'welcome'));
    assert.ok(catalog.find((c) => c.key === 'booking_confirmation'));
    assert.ok(catalog.find((c) => c.key === 'reminder_24h'));
    assert.ok(catalog.find((c) => c.key === 'reminder_1h'));
    assert.ok(catalog.find((c) => c.key === 'post_session_followup'));
  });

  await t.test('renders welcome template correctly', () => {
    const rendered = renderTemplate('welcome', { parentName: 'Amira', coachName: 'Mai' });
    assert.match(rendered, /Hello Amira/);
    assert.match(rendered, /Warmly,\nMai/);
  });

  await t.test('renders booking_confirmation with meeting link and date', () => {
    const rendered = renderTemplate('booking_confirmation', {
      parentName: 'Karim',
      appointmentType: 'Initial Consultation',
      date: '2026-10-01',
      time: '14:00',
      timezone: 'AST',
      meetingLink: 'https://meet.google.com/test-link',
    });
    assert.match(rendered, /Dear Karim/);
    assert.match(rendered, /Initial Consultation/);
    assert.match(rendered, /2026-10-01/);
    assert.match(rendered, /14:00 \(AST\)/);
    assert.match(rendered, /https:\/\/meet\.google\.com\/test-link/);
  });

  await t.test('renders reminder_24h template correctly', () => {
    const rendered = renderTemplate('reminder_24h', {
      parentName: 'Nadia',
      appointmentType: 'Nervous System Coaching',
      time: '11:00',
      meetingLink: 'https://meet.google.com/reminder-24h',
    });
    assert.match(rendered, /Hi Nadia/);
    assert.match(rendered, /tomorrow at \*11:00\*/);
    assert.match(rendered, /https:\/\/meet\.google\.com\/reminder-24h/);
  });

  await t.test('renders reminder_1h template correctly', () => {
    const rendered = renderTemplate('reminder_1h', {
      parentName: 'Nadia',
      appointmentType: 'Nervous System Coaching',
      meetingLink: 'https://meet.google.com/reminder-1h',
    });
    assert.match(rendered, /starts in approximately 1 hour/);
    assert.match(rendered, /https:\/\/meet\.google\.com\/reminder-1h/);
  });

  await t.test('renders post_session_followup template correctly', () => {
    const rendered = renderTemplate('post_session_followup', {
      parentName: 'Omar',
      feedbackLink: 'https://maielbadawy.net/feedback',
      notes: 'Practice the 3-breath pause before reacting.',
    });
    assert.match(rendered, /Dear Omar/);
    assert.match(rendered, /Practice the 3-breath pause/);
    assert.match(rendered, /https:\/\/maielbadawy\.net\/feedback/);
  });

  await t.test('throws descriptive error on unknown template', () => {
    assert.throws(
      () => renderTemplate('non_existent_template', {}),
      /Unknown template "non_existent_template"/
    );
  });

  await t.test('throws descriptive error when required parameters are missing', () => {
    assert.throws(
      () => renderTemplate('booking_confirmation', { parentName: 'Amira' }),
      /Missing required parameter\(s\) for template "booking_confirmation"/
    );
  });
});
