import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../../api';

// Mapping pour de jolis labels et couleurs
const STATUT_INFO = {
  'OUVERT': { label: 'Ouvert', color: '#3B82F6' },
  'EN_EXPERTISE': { label: 'En Expertise', color: '#8B5CF6' },
  'REJET_POUR_COMPLEMENT': { label: 'Rejeté (Complément)', color: '#F59E0B' },
  'EN_VALIDATION_LEGAL': { label: 'Validation Légale', color: '#10B981' },
  'EN_VALIDATION_HSE': { label: 'Validation HSE', color: '#059669' },
  'TRANSMIS_ASSUREUR': { label: 'Transmis Assureur', color: '#F97316' },
  'VALIDE': { label: 'Validé', color: '#84CC16' },
  'REJETE': { label: 'Rejeté', color: '#EF4444' },
  'CLOTURE': { label: 'Clôturé', color: '#14B8A6' },
  'ATTENTE_VALIDATION_FRANCHISE': { label: 'Attente Clôture (Franchise)', color: '#6366F1' },
  'CLOTURE_SOUS_FRANCHISE': { label: 'Clôturé sous franchise', color: '#0D9488' },
  'ARCHIVE': { label: 'Archivé', color: '#94A3B8' },
};

export default function AssuranceDashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats/assurance/')
      .then(res => {
        setStats(res.data);
      })
      .catch(err => console.error("Erreur stats assurance", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#94A3B8' }}>Chargement des statistiques...</p>;
  if (!stats) return null;

  const pieData = stats && stats.counts_by_status 
    ? Object.entries(stats.counts_by_status).map(([key, val]) => ({
        name: STATUT_INFO[key]?.label || key,
        value: val,
        color: STATUT_INFO[key]?.color || '#CBD5E1'
      })).sort((a, b) => b.value - a.value)
    : [];

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Nouvelle Card très visible pour les sinistres en attente */}
      <div style={{
        background: 'linear-gradient(135deg, #FF6B6B 0%, #E2000F 100%)',
        color: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(226, 0, 15, 0.2)',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, opacity: 0.9 }}>Sinistres en Attente</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>Nécessitent une validation ou une expertise (Ouvert, Sous Franchise)</p>
        </div>
        <div style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1 }}>
          {stats.en_attente_count}
        </div>
      </div>

      {/* Nouvelle section de distribution par statut */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2rem'
      }}>
        <div style={{ flex: '1 1 400px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#1E293B', fontSize: '1.1rem' }}>Répartition par État</h3>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Visualisez le volume actuel de sinistres dans chaque étape du flux de travail (ex: Transmis à l'assurance, en expertise, etc.).
          </p>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '0.85rem'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ color: '#334155', marginBottom: '1rem' }}>Commentaires sur l'état du parc</h4>
          <ul style={{ paddingLeft: '1.2rem', color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
             <li><strong>Volume global :</strong> La répartition permet d'identifier rapidement les goulots d'étranglement (ex: si trop de dossiers s'accumulent en Validation Légale ou HSE).</li>
             <li><strong>Transmis à l'assurance :</strong> Ces dossiers sont actuellement dans votre file d'attente pour une décision finale.</li>
             <li><strong>Dossiers ouverts / En expertise :</strong> Ils sont en cours de traitement initial par l'équipe terrain et les ingénieurs.</li>
             <li><strong>Clôturés & Archivés :</strong> Ils représentent l'historique traité avec succès (ou sans suite).</li>
          </ul>
        </div>
      </div>

      {/* Graphique des temps moyens par étape */}
      {stats.temps_moyen_par_etape && stats.temps_moyen_par_etape.length > 0 && (
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#1E293B', fontSize: '1.1rem' }}>Temps Moyen de Traitement par Étape (Heures)</h3>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.temps_moyen_par_etape} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748B', fontSize: 11}} 
                    dy={10} 
                    angle={-15}
                    textAnchor="end"
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dx={-10} />
                <RechartsTooltip
                  cursor={{fill: '#F8FAFC'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  formatter={(value) => [`${value} heures`, 'Temps Moyen']}
                />
                <Bar dataKey="duree_moyenne_heures" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={45} name="Heures Moyennes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
