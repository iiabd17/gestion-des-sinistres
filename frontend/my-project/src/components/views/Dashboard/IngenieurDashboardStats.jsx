import { useState, useEffect } from 'react';
import api from '../../../api';

const KPI_STYLES = {
  en_attente:      { bg: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', icon: '📋' },
  expertises_mois: { bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', icon: '✅' },
  temps_moyen:     { bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', icon: '⏱️' },
  urgents:         { bg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', icon: '🚨' },
};

export default function IngenieurDashboardStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/statistiques/dashboard/')
      .then(res => setData(res.data))
      .catch(err => console.error("Erreur stats ingénieur", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#94A3B8', padding: '1rem' }}>Chargement des KPIs...</p>;
  if (!data || !data.kpis) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: '1rem' }}>
        📊 Mes Indicateurs – Ingénieur
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
              <span style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>
                {typeof kpi.value === 'number' && kpi.key === 'montant'
                  ? kpi.value.toLocaleString('fr-FR')
                  : kpi.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
