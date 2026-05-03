import { useState, useEffect } from 'react';
import api from '../../../api';

const KPI_STYLES = {
  actifs:   { bg: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', icon: '📂' },
  clotures: { bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', icon: '✅' },
  total:    { bg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', icon: '📊' },
};

export default function EquipeTerrainDashboardStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/statistiques/dashboard/')
      .then(res => setData(res.data))
      .catch(err => console.error("Erreur stats équipe terrain", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#94A3B8', padding: '1rem' }}>Chargement des KPIs...</p>;
  if (!data || !data.kpis) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: '1rem' }}>
        📋 Mon Activité – Équipe Terrain
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {data.kpis.map(kpi => {
          const style = KPI_STYLES[kpi.key] || { bg: 'linear-gradient(135deg, #64748B 0%, #475569 100%)', icon: '📌' };
          return (
            <div key={kpi.key} style={{
              background: style.bg,
              color: 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9 }}>{kpi.label}</span>
                <span style={{ fontSize: '1.5rem' }}>{style.icon}</span>
              </div>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{kpi.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
