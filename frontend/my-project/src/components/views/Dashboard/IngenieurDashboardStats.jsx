import { useState, useEffect } from 'react';
import api from '../../../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

const KPI_STYLES = {
  en_attente: { 
    bg: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', 
    text: '#991B1B', 
    label: '#DC2626', 
    shadow: '0 4px 15px -3px rgba(220, 38, 38, 0.15)' 
  },

  expertises_mois: { 
    bg: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)', 
    text: '#0F172A', 
    label: '#475569', 
    shadow: '0 4px 15px -3px rgba(71, 85, 105, 0.15)' 
  },

  temps_moyen: { 
    bg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)', 
    text: '#075985', 
    label: '#0284C7', 
    shadow: '0 4px 15px -3px rgba(2, 132, 199, 0.15)' 
  },
};
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function IngenieurDashboardStats() {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [wilaya, setWilaya] = useState('');

  const fetchDashboardData = () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (wilaya) params.append('wilaya', wilaya);

    Promise.allSettled([
      api.get('/statistiques/dashboard/'),
      api.get(`/statistiques/ingenieur-analytics/?${params.toString()}`)
    ])
      .then(([resDashboard, resAnalytics]) => {
        if (resDashboard.status === 'fulfilled') {
          setData(resDashboard.value.data);
        }
        if (resAnalytics.status === 'fulfilled') {
          setAnalytics(resAnalytics.value.data);
        } else {
          console.error("Erreur analytics:", resAnalytics.reason);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    fetchDashboardData();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setWilaya('');
    // State updates are async, so we can't fetch immediately using state.
    // Instead, we just trigger a fetch without params here or rely on an effect.
    // Easiest is to just call api directly without params.
    setLoading(true);
    Promise.allSettled([
      api.get('/statistiques/dashboard/'),
      api.get(`/statistiques/ingenieur-analytics/`)
    ]).then(([resDashboard, resAnalytics]) => {
      if (resDashboard.status === 'fulfilled') setData(resDashboard.value.data);
      if (resAnalytics.status === 'fulfilled') setAnalytics(resAnalytics.value.data);
    }).finally(() => setLoading(false));
  };

  if (loading && !data) return <div className="dcd-center" style={{ padding: '2rem' }}><div className="dcd-spinner" /></div>;
  if (!data || !data.kpis) {
    return (
      <div style={{ padding: '2rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '2rem' }}>
        <strong>Erreur de chargement des statistiques:</strong>
        <p>Les données du tableau de bord n'ont pas pu être chargées.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>

      {/* ── KPIs Section ── */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '1.25rem', letterSpacing: '-0.5px' }}>
          Vue d'ensemble – Ingénieur
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
          {data.kpis.map(kpi => {
            const style = KPI_STYLES[kpi.key] || { bg: 'linear-gradient(135deg, #64748B 0%, #475569 100%)', text: '#fff', label: '#cbd5e1', shadow: 'none' };
            return (
              <div key={kpi.key} style={{
                background: style.bg,
                color: style.text,
                padding: '1.5rem',
                borderRadius: '16px',
                boxShadow: style.shadow,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'default'
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: style.label, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</span>
                </div>
                <span style={{ fontSize: '2.75rem', fontWeight: 800, lineHeight: 1, position: 'relative', zIndex: 1 }}>
                  {typeof kpi.value === 'number' && kpi.key === 'montant'
                    ? kpi.value.toLocaleString('fr-FR')
                    : kpi.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Advanced Analytics Filters ── */}
      <div style={{
        background: '#FFFFFF', padding: '1.25rem 1.5rem', borderRadius: '16px',
        border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#3B82F6', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 1 180px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Début</label>
          <input type="date" lang="en-US" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s', background: '#F8FAFC', fontFamily: 'inherit', color: '#1E293B' }}
            onFocus={e => e.target.style.borderColor = '#3B82F6'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 1 180px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Fin</label>
          <input type="date" lang="en-US" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s', background: '#F8FAFC', fontFamily: 'inherit', color: '#1E293B' }}
            onFocus={e => e.target.style.borderColor = '#3B82F6'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Région / Wilaya</label>
          <input type="text" placeholder="Ex: Alger" value={wilaya} onChange={e => setWilaya(e.target.value)}
            style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s', background: '#F8FAFC', color: '#1E293B' }}
            onFocus={e => e.target.style.borderColor = '#3B82F6'} onBlur={e => e.target.style.borderColor = '#CBD5E1'} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button onClick={handleApplyFilters}
            style={{ padding: '0.6rem 1.25rem', background: '#0F172A', color: '#fff', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer', transition: 'background 0.2s, transform 0.1s', boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)' }}
            onMouseEnter={e => e.target.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.target.style.transform = 'none'}
            onMouseDown={e => e.target.style.transform = 'translateY(1px)'}>
            Appliquer
          </button>
          <button onClick={handleResetFilters}
            style={{ padding: '0.6rem 1.25rem', background: '#FFFFFF', color: '#475569', borderRadius: '8px', fontWeight: '600', border: '1px solid #CBD5E1', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => e.target.style.background = '#F8FAFC'}
            onMouseLeave={e => e.target.style.background = '#FFFFFF'}>
            Réinitialiser
          </button>
        </div>
      </div>

      {/* ── Advanced Analytics Charts ── */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>

          {/* Incident Distribution */}
          <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0F172A', marginBottom: '1.5rem', letterSpacing: '-0.5px', textAlign: 'center' }}>Répartition par Nature</h3>
            <div style={{ height: 600, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.distributionNature} cx="50%" cy="50%" innerRadius={140} outerRadius={220} paddingAngle={4} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {analytics.distributionNature.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 Problematic Sites */}
          <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A', marginBottom: '1.5rem', letterSpacing: '-0.5px' }}>Top 5 Sites Problématiques</h3>
            <div style={{ height: 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={analytics.topSites} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }} />
                  <Bar dataKey="count" fill="#EF4444" radius={[0, 6, 6, 0]} name="Sinistres" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Analysis */}
          <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A', marginBottom: '1.5rem', letterSpacing: '-0.5px' }}>Analyse des Coûts (DZD)</h3>
            <div style={{ height: 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.costAnalysis} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [`${value.toLocaleString('fr-FR')} DZD`, 'Coût']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }} />
                  <Area type="monotone" dataKey="cost" stroke="#10B981" fillOpacity={1} fill="url(#colorCost)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
