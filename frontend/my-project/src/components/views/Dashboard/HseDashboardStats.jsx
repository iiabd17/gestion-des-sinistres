import { useState, useEffect } from 'react';
import api from '../../../api';

// Icons
const IconFire = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>
);
const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const IconShieldAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);

const KPI_STYLES = {
  en_attente_rapport: { bg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(234, 88, 12, 0.3)', icon: <IconFire /> },
  valides:            { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16, 185, 129, 0.3)', icon: <IconCheckCircle /> },
  total_incidents:    { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', shadow: 'rgba(220, 38, 38, 0.3)', icon: <IconShieldAlert /> },
};

export default function HseDashboardStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/statistiques/dashboard/')
      .then(res => setData(res.data))
      .catch(err => console.error("Erreur stats HSE", err))
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', margin: 0, letterSpacing: '-0.3px' }}>
          Mes Indicateurs – Service HSE
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {data.kpis.map(kpi => {
          const style = KPI_STYLES[kpi.key] || { bg: 'linear-gradient(135deg, #64748B 0%, #475569 100%)', shadow: 'rgba(100, 116, 139, 0.3)', icon: <IconShield /> };
          return (
            <div key={kpi.key} className="hse-stat-card" style={{
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
        .hse-stat-card:hover {
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
