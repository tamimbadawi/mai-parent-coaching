import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, CreditCard, Check, ArrowRight, User, Mail, MessageSquare } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import { appointmentTypes } from '../data/content';

export default function Booking() {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);

  const selectedAppointment = appointmentTypes.find((a) => a.id === selectedType);

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    return dates.slice(0, 10);
  };

  const generateTimes = () => {
    const times = [];
    for (let h = 9; h <= 17; h++) {
      times.push(`${h}:00`);
      times.push(`${h}:30`);
    }
    return times;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-sage" />
          </div>
          <h1 className="font-serif text-3xl text-charcoal mb-4">Booking Confirmed!</h1>
          <p className="text-warm-gray mb-6">
            Thank you, {formData.name}. Your {selectedAppointment?.title} is scheduled for {selectedDate} at {selectedTime}. A confirmation email has been sent to {formData.email}.
          </p>
          <Link
            to="/"
            className="bg-sage text-white px-8 py-4 rounded-full font-medium inline-flex items-center gap-2 hover:bg-sage-dark transition-all"
          >
            Back to Home <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-12">
          <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">Book a Session</span>
          <h1 className="font-serif text-4xl text-charcoal mt-3 mb-4">Schedule Your Appointment</h1>
          <p className="text-warm-gray max-w-xl mx-auto">
            Choose your session type, pick a date and time, and complete your booking in minutes.
          </p>
        </AnimatedSection>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  step >= s ? 'bg-sage text-white' : 'bg-beige text-soft-gray'
                }`}
              >
                {s}
              </div>
              {s < 4 && <div className={`w-12 h-0.5 ${step > s ? 'bg-sage' : 'bg-beige'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Type */}
        {step === 1 && (
          <AnimatedSection>
            <div className="space-y-4">
              {appointmentTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`w-full text-left bg-cream rounded-2xl p-6 border transition-all duration-300 ${
                    selectedType === type.id
                      ? 'border-sage shadow-md ring-1 ring-sage/20'
                      : 'border-beige/50 hover:border-beige hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-serif text-xl text-charcoal mb-2">{type.title}</h3>
                      <p className="text-warm-gray text-sm mb-3">{type.description}</p>
                      <div className="flex gap-4 text-sm">
                        <span className="flex items-center gap-1 text-soft-gray">
                          <Clock className="w-4 h-4" /> {type.duration}
                        </span>
                        <span className="flex items-center gap-1 text-soft-gray">
                          <CreditCard className="w-4 h-4" /> {type.price === 0 ? 'Free' : `$${type.price}`}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                        selectedType === type.id ? 'border-sage bg-sage' : 'border-beige'
                      }`}
                    >
                      {selectedType === type.id && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                </button>
              ))}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => selectedType && setStep(2)}
                  disabled={!selectedType}
                  className="bg-sage text-white px-8 py-3 rounded-full font-medium inline-flex items-center gap-2 hover:bg-sage-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Step 2: Select Date */}
        {step === 2 && (
          <AnimatedSection>
            <div className="bg-cream rounded-2xl p-8 border border-beige">
              <h3 className="font-serif text-xl text-charcoal mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sage" /> Select a Date
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {generateDates().map((date) => {
                  const d = new Date(date);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = d.getDate();
                  const month = d.toLocaleDateString('en-US', { month: 'short' });
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        selectedDate === date
                          ? 'border-sage bg-sage/10 ring-1 ring-sage/20'
                          : 'border-beige hover:border-sage/30 bg-ivory'
                      }`}
                    >
                      <p className="text-xs text-soft-gray uppercase">{dayName}</p>
                      <p className={`text-2xl font-serif ${selectedDate === date ? 'text-sage-dark' : 'text-charcoal'}`}>
                        {dayNum}
                      </p>
                      <p className="text-xs text-soft-gray">{month}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="text-warm-gray hover:text-charcoal transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => selectedDate && setStep(3)}
                  disabled={!selectedDate}
                  className="bg-sage text-white px-8 py-3 rounded-full font-medium inline-flex items-center gap-2 hover:bg-sage-dark transition-all disabled:opacity-50"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Step 3: Select Time */}
        {step === 3 && (
          <AnimatedSection>
            <div className="bg-cream rounded-2xl p-8 border border-beige">
              <h3 className="font-serif text-xl text-charcoal mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-sage" /> Select a Time
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {generateTimes().map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all duration-300 ${
                      selectedTime === time
                        ? 'border-sage bg-sage/10 text-sage-dark ring-1 ring-sage/20'
                        : 'border-beige hover:border-sage/30 bg-ivory text-charcoal'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-6">
                <button
                  onClick={() => setStep(2)}
                  className="text-warm-gray hover:text-charcoal transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => selectedTime && setStep(4)}
                  disabled={!selectedTime}
                  className="bg-sage text-white px-8 py-3 rounded-full font-medium inline-flex items-center gap-2 hover:bg-sage-dark transition-all disabled:opacity-50"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <AnimatedSection>
            <div className="bg-cream rounded-2xl p-8 border border-beige">
              <h3 className="font-serif text-xl text-charcoal mb-6">Your Details</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-soft-gray" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-ivory border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                        placeholder="Your name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-soft-gray" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-ivory border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">Notes (Optional)</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-soft-gray" />
                    <textarea
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-ivory border border-beige text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 transition-all resize-none"
                      placeholder="Anything you'd like me to know before our session..."
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-ivory rounded-xl p-6 border border-beige">
                  <h4 className="font-medium text-charcoal mb-3">Booking Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Session</span>
                      <span className="text-charcoal font-medium">{selectedAppointment?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Date</span>
                      <span className="text-charcoal font-medium">
                        {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Time</span>
                      <span className="text-charcoal font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-beige">
                      <span className="text-warm-gray">Total</span>
                      <span className="text-charcoal font-medium">
                        {selectedAppointment?.price === 0 ? 'Free' : `$${selectedAppointment?.price}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-warm-gray hover:text-charcoal transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="bg-sage text-white px-8 py-3 rounded-full font-medium inline-flex items-center gap-2 hover:bg-sage-dark transition-all"
                  >
                    Confirm Booking <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
