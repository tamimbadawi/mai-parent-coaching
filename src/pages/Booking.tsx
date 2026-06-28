import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Clock, CreditCard, Check, ArrowRight,
  User, Mail, MessageSquare, Sparkles, Heart,
  Brain, Users, Star, CalendarDays,
} from 'lucide-react';
import { appointmentTypes } from '../data/content';

// Maps each appointment id → a cute icon + colour pair
const SESSION_ICONS: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  'initial': {
    icon: <Sparkles className="w-3.5 h-3.5" />,
    bg: 'bg-sage/15',
    text: 'text-sage-dark',
  },
  'coaching-60': {
    icon: <Heart className="w-3.5 h-3.5" />,
    bg: 'bg-terracotta/10',
    text: 'text-terracotta-dark',
  },
  'intensive-90': {
    icon: <Brain className="w-3.5 h-3.5" />,
    bg: 'bg-dusty-blue/15',
    text: 'text-dusty-blue-dark',
  },
  'family': {
    icon: <Users className="w-3.5 h-3.5" />,
    bg: 'bg-olive/10',
    text: 'text-olive',
  },
  'follow-up': {
    icon: <Star className="w-3.5 h-3.5" />,
    bg: 'bg-gold/15',
    text: 'text-[rgb(var(--color-terracotta-dark))]',
  },
};

export default function Booking() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);

  const selectedAppointment = appointmentTypes.find((a) => a.id === selectedType);

  const generateDates = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 21; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d.toISOString().split('T')[0]);
      if (dates.length === 10) break;
    }
    return dates;
  };

  const generateTimes = () => {
    const times: string[] = [];
    for (let h = 9; h <= 17; h++) {
      times.push(`${h}:00`);
      if (h < 17) times.push(`${h}:30`);
    }
    return times;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const canSubmit = !!(selectedType && selectedDate && selectedTime && formData.name && formData.email);

  /* ── Confirmation ── */
  if (submitted) {
    return (
      <div className="h-screen flex items-center justify-center bg-ivory px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-sage/15 flex items-center justify-center mx-auto mb-4 ring-4 ring-sage/20">
            <Check className="w-6 h-6 text-sage-dark" />
          </div>
          <h1 className="font-serif text-2xl text-charcoal mb-2">You're all set!</h1>
          <p className="text-warm-gray text-sm leading-relaxed mb-5">
            <span className="text-charcoal font-medium">{selectedAppointment?.title}</span> booked for{' '}
            <span className="text-charcoal font-medium">
              {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>{' '}
            at <span className="text-charcoal font-medium">{selectedTime}</span>.
            <br />Confirmation sent to <span className="text-charcoal font-medium">{formData.email}</span>.
          </p>
          <Link
            to="/"
            className="bg-sage text-white px-6 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 hover:bg-sage-dark transition-all shadow-sm"
          >
            Back to Home <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const dates = generateDates();
  const times = generateTimes();

  return (
    /*
      On mobile: single column, fully scrollable.
      On desktop (lg+): h-screen with the 3-column compact layout.
    */
    <div className="min-h-screen bg-ivory flex flex-col" style={{ paddingTop: '64px' }}>

      {/* ── Slim header bar ── */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-beige/70 bg-ivory/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-serif text-lg text-charcoal leading-none">Book a Session</h1>
            <p className="text-xs text-soft-gray mt-0.5 hidden sm:block">Fill in your preferences below</p>
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {[
              { label: 'Session', done: !!selectedType,  icon: <Sparkles className="w-2.5 h-2.5" /> },
              { label: 'Date',    done: !!selectedDate,  icon: <CalendarDays className="w-2.5 h-2.5" /> },
              { label: 'Time',    done: !!selectedTime,  icon: <Clock className="w-2.5 h-2.5" /> },
              { label: 'Details', done: !!(formData.name && formData.email), icon: <User className="w-2.5 h-2.5" /> },
            ].map(({ label, done, icon }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${done ? 'bg-sage text-white scale-105 shadow-sm' : 'bg-beige text-soft-gray'}`}>
                  {done ? <Check className="w-2.5 h-2.5" /> : icon}
                </div>
                <span className="text-[10px] text-soft-gray hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden lg:flex lg:flex-col">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 w-full
          flex flex-col gap-6
          lg:h-full lg:grid lg:grid-cols-12 lg:gap-4 lg:flex-none">

          {/* COL 1 — Session type */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <SectionHeader icon={<Heart className="w-3 h-3 text-sage-dark" />} label="Session Type" />
            <div className="flex flex-col gap-2">
              {appointmentTypes.map((type) => {
                const sel = selectedType === type.id;
                const meta = SESSION_ICONS[type.id] ?? { icon: <Sparkles className="w-3.5 h-3.5" />, bg: 'bg-sage/15', text: 'text-sage-dark' };
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`text-left rounded-xl px-3.5 py-2.5 border transition-all duration-200 group ${
                      sel
                        ? 'border-sage bg-sage/8 ring-1 ring-sage/20 shadow-sm'
                        : 'border-beige bg-cream hover:border-sage/40 hover:bg-cream/80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Session icon */}
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all ${sel ? meta.bg + ' ' + meta.text : 'bg-beige/60 text-soft-gray group-hover:' + meta.bg}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className={`font-serif text-sm leading-snug ${sel ? 'text-sage-dark' : 'text-charcoal'}`}>
                            {type.title}
                          </span>
                          {type.price === 0 && (
                            <span className="text-[9px] font-semibold bg-sage/20 text-sage-dark px-1.5 py-0.5 rounded-full shrink-0">Free</span>
                          )}
                        </div>
                        <p className="text-warm-gray text-[11px] leading-relaxed line-clamp-2">{type.description}</p>
                        <div className="flex gap-3 text-[10px] text-soft-gray mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{type.duration}</span>
                          {type.price > 0 && (
                            <span className="flex items-center gap-1"><CreditCard className="w-2.5 h-2.5" />${type.price}</span>
                          )}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all mt-0.5 ${
                        sel ? 'border-sage bg-sage' : 'border-beige group-hover:border-sage/50'
                      }`}>
                        {sel && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* COL 2 — Date + Time */}
          <div className="lg:col-span-4 flex flex-col gap-3">

            {/* Date */}
            <div className="flex flex-col gap-2">
              <SectionHeader icon={<Calendar className="w-3 h-3 text-sage-dark" />} label="Date" />
              <div className="grid grid-cols-5 gap-1.5">
                {dates.map((date) => {
                  const d = new Date(date);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = d.getDate();
                  const month = d.toLocaleDateString('en-US', { month: 'short' });
                  const sel = selectedDate === date;
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center py-2 rounded-xl border transition-all duration-200 ${
                        sel
                          ? 'border-sage bg-sage/10 ring-1 ring-sage/20 shadow-sm'
                          : 'border-beige bg-cream hover:border-sage/40'
                      }`}
                    >
                      <span className="text-[9px] text-soft-gray uppercase tracking-wide">{dayName}</span>
                      <span className={`font-serif text-sm leading-tight ${sel ? 'text-sage-dark' : 'text-charcoal'}`}>{dayNum}</span>
                      <span className="text-[9px] text-soft-gray">{month}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-beige/60" />

            {/* Time */}
            <div className="flex flex-col gap-2">
              <SectionHeader icon={<Clock className="w-3 h-3 text-terracotta" />} label="Time" />
              <div className="grid grid-cols-4 gap-1.5">
                {times.map((time) => {
                  const sel = selectedTime === time;
                  return (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-1.5 rounded-lg border text-[11px] font-medium transition-all duration-200 ${
                        sel
                          ? 'border-sage bg-sage/10 text-sage-dark ring-1 ring-sage/20 shadow-sm'
                          : 'border-beige bg-cream hover:border-sage/40 text-charcoal'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COL 3 — Details + Summary */}
          <div className="lg:col-span-3 flex flex-col gap-3">

            {/* Details form */}
            <div className="flex flex-col gap-2">
              <SectionHeader icon={<User className="w-3 h-3 text-dusty-blue-dark" />} label="Your Details" />
              <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
                <div>
                  <label className="block text-[10px] font-medium text-warm-gray mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-soft-gray" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-cream border border-beige text-xs focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all placeholder:text-soft-gray"
                      placeholder="Your name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-warm-gray mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-soft-gray" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-cream border border-beige text-xs focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all placeholder:text-soft-gray"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-warm-gray mb-1">Notes <span className="text-soft-gray font-normal">(optional)</span></label>
                  <div className="relative">
                    <MessageSquare className="absolute left-2.5 top-2 w-3 h-3 text-soft-gray" />
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-cream border border-beige text-xs focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all resize-none placeholder:text-soft-gray"
                      placeholder="Anything to share before our session…"
                    />
                  </div>
                </div>

                {/* Booking summary inline */}
                <div className={`rounded-xl border p-3 transition-all duration-300 ${selectedAppointment ? 'border-sage/20 bg-sage/5' : 'border-beige bg-cream/50'}`}>
                  <p className="text-[10px] font-medium text-warm-gray uppercase tracking-wider mb-2">Summary</p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-soft-gray">Session</span>
                      <span className={`text-right font-medium leading-tight ${selectedAppointment ? 'text-charcoal' : 'text-soft-gray italic'}`}>
                        {selectedAppointment?.title ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-soft-gray">Date</span>
                      <span className={`font-medium ${selectedDate ? 'text-charcoal' : 'text-soft-gray italic'}`}>
                        {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-soft-gray">Time</span>
                      <span className={`font-medium ${selectedTime ? 'text-charcoal' : 'text-soft-gray italic'}`}>
                        {selectedTime ?? '—'}
                      </span>
                    </div>
                    {selectedAppointment && (
                      <div className="flex justify-between gap-2 pt-1.5 border-t border-beige/80">
                        <span className="text-soft-gray">Total</span>
                        <span className="font-semibold text-charcoal">
                          {selectedAppointment.price === 0 ? 'Free' : `$${selectedAppointment.price}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full bg-sage text-white py-2.5 rounded-full text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-sage-dark transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm Booking <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Help link */}
            <p className="text-[11px] text-center text-soft-gray">
              Need help?{' '}
              <Link to="/contact" className="text-sage-dark hover:underline font-medium">
                Contact me
              </Link>
            </p>

          </div>

        </div>
      </div>
    </div>
  );
}


function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center justify-center w-6 h-6 rounded-xl bg-gradient-to-br from-sage/20 to-sage/5 shadow-sm border border-sage/10">
        {icon}
      </span>
      <span className="text-xs font-semibold text-charcoal tracking-wide">{label}</span>
    </div>
  );
}
