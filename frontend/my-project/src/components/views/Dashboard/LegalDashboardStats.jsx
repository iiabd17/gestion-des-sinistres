import { useState, useEffect } from 'react';
import api from '../../../api';

// Icons
const IconScroll = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const IconScale = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/><polyline points="19 6 12 3 5 6"/><path d="M5 6v6a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V6"/><path d="M19 6v6a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V6"/></svg>
);

const KPI_STYLES = {
  en_attente_pv: { bg: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', shadow: 'rgba(124, 58, 237, 0.3)', icon: <IconScroll /> },
  valides:       { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16, 185, 129, 0.3)', icon: <IconCheckCircle /> },
  total_vol:     { bg: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', shadow: 'rgba(99, 102, 241, 0.3)', icon: <IconLock /> },
};

export default function LegalDashboardStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/statistiques/dashboard/')
      .then(res => setData(res.data))
      .catch(err => console.error("Erreur stats légal", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', gap: 16, marginBottom: '2rem' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ flex: 1, height: 120, background: '#e2e8f0', borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  );
  if (!data || !data.kpis) return null;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef2f2', color: '#E2000F', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fee2e2' }}>
          <IconScale />
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', margin: 0, letterSpacing: '-0.3px' }}>
          Mes Indicateurs – Service Légal
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {data.kpis.map(kpi => {
          const style = KPI_STYLES[kpi.key] || { bg: 'linear-gradient(135deg, #64748B 0%, #475569 100%)', shadow: 'rgba(100, 116, 139, 0.3)', icon: <IconScroll /> };
          return (
            <div key={kpi.key} className="legal-stat-card" style={{
              background: style.bg,
              color: 'white',
              padding: '24px',
              borderRadius: '20px',
              boxShadow: `0 10px 25px -5px ${style.shadow}, 0 8px 10px -6px ${style.shadow}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
              cursor: 'default'
            }}>
              {/* Subtle background decoration */}
              <div style={{
                position: 'absolute', right: '-10%', top: '-20%', width: '140px', height: '140px',
                background: 'rgba(255,255,255,0.12)', borderRadius: '50%', filter: 'blur(20px)'
              }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, opacity: 0.95, letterSpacing: '0.2px', maxWidth: '75%', lineHeight: 1.4 }}>
                  {kpi.label}
                </span>
                <div style={{ 
                  width: '46px', height: '46px', 
                  borderRadius: '14px', 
                  background: 'rgba(255,255,255,0.2)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(4px)'
                }}>
                  <div style={{ width: 24, height: 24 }}>
                    {style.icon}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, position: 'relative', zIndex: 1 }}>
                {kpi.value}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`
        .legal-stat-card:hover {
          transform: translateY(-5px);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
