import React, { useState } from 'react';
import {
  Share2, Film, Video, Users, Target, Globe, Code, Palette,
  Search, PenTool, ChevronDown, ChevronUp, CheckCircle
} from 'lucide-react';

const services = [
  {
    icon: Share2, color: '#1E88E5', bg: '#E3F2FD',
    name: 'Social Media Management',
    description: "End-to-end management of your brand's social media presence across all platforms with data-driven strategy.",
    benefits: ['Consistent brand voice', 'Audience engagement growth', 'Platform-specific content', 'Monthly analytics report'],
    deliverables: ['Content calendar', '10-20 posts/month', 'Story templates', 'Monthly report'],
    timeline: '1–2 weeks onboarding, ongoing monthly',
  },
  {
    icon: Film, color: '#43A047', bg: '#E8F5E9',
    name: 'Reel Creation Scripts',
    description: 'High-quality short-form video scripts crafted to capture attention, drive engagement, and grow reach on Instagram & YouTube.',
    benefits: ['Increased reach & virality', 'Professional editing', 'Trending hooks' , 'Platform-optimized format'],
    deliverables: ['4–8 reels/month', 'Captions & hashtags', 'Thumbnail designs'],
    timeline: '2–3 days per reel',
  },
  {
    icon: Video, color: '#1565C0', bg: '#E3F2FD',
    name: 'Video Editing',
    description: 'Professional video editing for long-form and short-form content including colour grading, motion graphics, and subtitles.',
    benefits: ['Cinema-grade quality', 'Fast turnaround', 'Brand-consistent visuals', 'Multiple export formats'],
    deliverables: ['Edited video files', 'Thumbnail options', 'Optimised exports'],
    timeline: '2–5 business days per video',
  },
  {
    icon: Users, color: '#F4B400', bg: '#FFF8E1',
    name: 'Influencer Marketing',
    description: 'Strategic influencer partnerships that put your brand in front of highly engaged, relevant audiences.',
    benefits: ['Authentic endorsements', 'Targeted audience reach', 'ROI tracking', 'Content repurposing rights'],
    deliverables: ['Influencer shortlist', 'Campaign brief', 'Collaboration posts', 'Performance report'],
    timeline: '1–2 weeks per campaign',
  },
  {
    icon: Target, color: '#E53935', bg: '#FFEBEE',
    name: 'Meta Ads (Facebook & Instagram)',
    description: 'Performance-driven Meta ad campaigns with precise targeting to generate leads, sales, and brand awareness.',
    benefits: ['Laser-targeted audiences', 'A/B tested creatives', 'Daily optimisation', 'Transparent reporting'],
    deliverables: ['Ad creatives', 'Audience setup', 'Weekly performance report', 'Monthly strategy call'],
    timeline: '3–5 days setup, ongoing',
  },
  
  {
    icon: Code, color: '#43A047', bg: '#E8F5E9',
    name: 'Website Development',
    description: 'Custom, high-performance websites built for speed, conversions, and stunning visual identity.',
    benefits: ['Mobile-first responsive', 'SEO-ready structure', 'Fast load times', 'CMS integration'],
    deliverables: ['Design mockups', 'Fully developed site', 'QA & testing', 'Launch support'],
    timeline: '3–6 weeks depending on scope',
  },
  
  
  
];

export default function ServicesPage() {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="page">
      <div className="page-title">Our Services</div>
      <div className="page-subtitle">Everything your brand needs to grow — under one roof</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {services.map((svc, i) => {
          const Icon = svc.icon;
          const open = expanded === i;
          return (
            <div key={i} className="card" style={{ transition: 'all 0.2s' }}>
              <div style={{ padding: '20px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 46, height: 46, background: svc.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={22} color={svc.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{svc.name}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>{svc.description}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setExpanded(open ? null : i)}
                style={{ width: '100%', background: 'none', border: 'none', borderTop: '1px solid #F3F4F6', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: svc.color, fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}
              >
                {open ? 'Hide Details' : 'View Details'}
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {open && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Benefits</div>
                      {svc.benefits.map(b => (
                        <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 6 }}>
                          <CheckCircle size={13} color="#43A047" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 13 }}>{b}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Deliverables</div>
                      {svc.deliverables.map(d => (
                        <div key={d} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 6 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: svc.color, flexShrink: 0, marginTop: 6 }} />
                          <span style={{ fontSize: 13 }}>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 14, padding: '10px 14px', background: svc.bg, borderRadius: 9 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: svc.color }}>⏱ Timeline: </span>
                    <span style={{ fontSize: 13, color: '#374151' }}>{svc.timeline}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
