import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Signed in successfully.');
  };

  return (
    <div className="min-h-screen pt-24 bg-ivory px-4 py-20">
      <div className="mx-auto max-w-md rounded-2xl border border-beige/50 bg-cream p-8 shadow-sm">
        <h1 className="font-serif text-3xl text-charcoal">Member Login</h1>
        <p className="mt-2 text-sm text-warm-gray">Sign in to access your courses, resources, and future dashboard features.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-charcoal">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-beige bg-ivory px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-charcoal">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-beige bg-ivory px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="Your password"
            />
          </div>

          {message ? <p className="text-sm text-terracotta-dark">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-sage px-6 py-3 text-sm font-medium text-white transition-all hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
