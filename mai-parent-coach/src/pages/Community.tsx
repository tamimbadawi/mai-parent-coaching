import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ThumbsUp, Users, Video, Trophy, Lock, ArrowRight } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import { communityPosts } from '../data/content';

export default function Community() {
  const [activeTab, setActiveTab] = useState('discussions');

  const tabs = [
    { id: 'discussions', label: 'Discussions', icon: MessageCircle },
    { id: 'live', label: 'Live Events', icon: Video },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
  ];

  return (
    <div className="min-h-screen pt-24">
      {/* Hero */}
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <span className="text-sage-dark text-sm font-medium tracking-wider uppercase">Community</span>
            <h1 className="font-serif text-4xl md:text-5xl text-charcoal mt-3 mb-6">
              You're Not Alone
            </h1>
            <p className="text-warm-gray text-lg leading-relaxed max-w-2xl mx-auto">
              Join a warm, supportive community of parents who understand. Share wins, ask questions, and grow together.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 bg-ivory">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, title: 'Private Discussions', desc: 'Safe, moderated spaces to share and connect.' },
              { icon: Video, title: 'Live Q&A Sessions', desc: 'Monthly live events with replays available.' },
              { icon: Trophy, title: 'Monthly Challenges', desc: 'Guided practices to build new habits together.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <AnimatedSection key={item.title} delay={i * 0.1}>
                  <div className="bg-cream rounded-2xl p-8 text-center border border-beige/50 hover:border-beige hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-sage-dark" />
                    </div>
                    <h3 className="font-serif text-lg text-charcoal mb-2">{item.title}</h3>
                    <p className="text-warm-gray text-sm">{item.desc}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tabs & Content */}
      <section className="py-20 bg-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 mb-8 justify-center">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-sage text-white'
                      : 'bg-ivory text-warm-gray hover:bg-beige'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'discussions' && (
            <div className="space-y-4">
              {communityPosts.map((post, i) => (
                <AnimatedSection key={post.id} delay={i * 0.08}>
                  <div className="bg-ivory rounded-2xl p-6 border border-beige/50 hover:border-beige hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-sage/10 text-sage-dark px-3 py-1 rounded-full text-xs font-medium">
                        {post.category}
                      </span>
                      <span className="text-soft-gray text-xs">{post.date}</span>
                    </div>
                    <h3 className="font-serif text-lg text-charcoal mb-2">{post.title}</h3>
                    <p className="text-warm-gray text-sm leading-relaxed mb-4">{post.content}</p>
                    <div className="flex items-center gap-6 text-sm text-soft-gray">
                      <span className="flex items-center gap-1.5">
                        <ThumbsUp className="w-4 h-4" /> {post.likes}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4" /> {post.replies}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> {post.author}
                      </span>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          )}

          {activeTab === 'live' && (
            <AnimatedSection>
              <div className="bg-ivory rounded-2xl p-8 border border-beige text-center">
                <Video className="w-12 h-12 text-sage mx-auto mb-4" />
                <h3 className="font-serif text-xl text-charcoal mb-2">Live Q&A Sessions</h3>
                <p className="text-warm-gray mb-6">
                  Join monthly live Q&A sessions where I answer your parenting questions in real-time. Replays are always available for members.
                </p>
                <div className="space-y-3 max-w-md mx-auto text-left">
                  <div className="bg-cream rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-charcoal text-sm">January Live Q&A</p>
                      <p className="text-soft-gray text-xs">Jan 28, 2024 at 7:00 PM EST</p>
                    </div>
                    <span className="bg-sage/10 text-sage-dark px-3 py-1 rounded-full text-xs font-medium">Upcoming</span>
                  </div>
                  <div className="bg-cream rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-charcoal text-sm">December Replay: Sibling Conflict</p>
                      <p className="text-soft-gray text-xs">Available now</p>
                    </div>
                    <span className="bg-dusty-blue/10 text-dusty-blue-dark px-3 py-1 rounded-full text-xs font-medium">Replay</span>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          )}

          {activeTab === 'challenges' && (
            <AnimatedSection>
              <div className="bg-ivory rounded-2xl p-8 border border-beige text-center">
                <Trophy className="w-12 h-12 text-terracotta mx-auto mb-4" />
                <h3 className="font-serif text-xl text-charcoal mb-2">Monthly Challenges</h3>
                <p className="text-warm-gray mb-6">
                  Participate in guided monthly challenges to build new habits and deepen your parenting practice.
                </p>
                <div className="bg-cream rounded-xl p-6 max-w-md mx-auto">
                  <p className="font-medium text-charcoal mb-1">February Challenge: Daily Connection Rituals</p>
                  <p className="text-warm-gray text-sm mb-4">
                    28 days of simple, evidence-based practices to strengthen your bond with your child.
                  </p>
                  <div className="w-full bg-beige rounded-full h-2 mb-2">
                    <div className="bg-sage h-2 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <p className="text-xs text-soft-gray">Starts February 1st</p>
                </div>
              </div>
            </AnimatedSection>
          )}
        </div>
      </section>

      {/* Join CTA */}
      <section className="py-20 bg-sage/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <Lock className="w-10 h-10 text-sage mx-auto mb-4" />
            <h2 className="font-serif text-3xl text-charcoal mb-4">Join the Community</h2>
            <p className="text-warm-gray text-lg mb-8 max-w-xl mx-auto">
              Community access is included with any course purchase or coaching package. Or join standalone for $9/month.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/courses"
                className="bg-sage text-white px-8 py-4 rounded-full font-medium inline-flex items-center gap-2 justify-center hover:bg-sage-dark transition-all hover:shadow-lg"
              >
                Enroll in a Course <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="bg-ivory text-charcoal border border-beige px-8 py-4 rounded-full font-medium inline-flex items-center gap-2 justify-center hover:bg-cream transition-all"
              >
                Contact for Access
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
