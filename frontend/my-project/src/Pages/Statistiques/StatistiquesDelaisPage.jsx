import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../api';
import Sidebar from '../../componenets/Sidebar/Sidebar';

// Options pour le menu déroulant (correspondant à STATUT_CHOICES)
const STATUT_OPTIONS = [
  { value: 'OUVERT', label: 'Ouvert' },
  { value: 'EN_EXPERTISE', label: 'En Expertise' },
  { value: 'REJET_POUR_COMPLEMENT', label: 'Rejeté pour Complément' },
  { value: 'EN_VALIDATION_LEGAL', label: 'En Validation Légale' },
  { value: 'EN_VALIDATION_HSE', label: 'En Validation HSE' },
  { value: 'TRANSMIS_ASSUREUR', label: "Transmis à l'Assureur" },
  { value: 'VALIDE', label: 'Validé' },
  { value: 'REJETE', label: 'Rejeté' },
  { value: 'CLOTURE', label: 'Clôturé' },
  { value: 'ATTENTE_VALIDATION_FRANCHISE', label: 'En Attente de Clôture (Sous Franchise)' },
  { value: 'CLOTURE_SOUS_FRANCHISE', label: 'Clôturé — Sous Franchise' },
  { value: 'ARCHIVE', label: 'Archivé' },
];

export default function StatistiquesDelaisPage() {
  const [selectedStatut, setSelectedStatut] = useState('EN_EXPERTISE');
  const [periode, setPeriode] = useState('tout');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/stats/delais-detail/?statut=${selectedStatut}&periode=${periode}`)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error("Erreur lors de la récupération des délais", err);
      })
      .finally(() => setLoading(false));
  }, [selectedStatut]);

  return (
    <div className="db-layout">
      <Sidebar />
      <div className="db-main" style={{ padding: '2rem', backgroundColor: '#F8FAFC', minHeight: '100vh', overflowY: 'auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', color: '#0F172A', margin: 0 }}>Analyse des Délais</h1>
            <p style={{ color: '#64748B', margin: '0.5rem 0 0 0' }}>Examinez le temps passé par chaque sinistre dans une étape spécifique.</p>
          </div>
          
          <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <label htmlFor="statut-select" style={{ marginRight: '1rem', fontWeight: 500, color: '#334155' }}>
              Sélectionnez une étape :
            </label>
            <select
              id="statut-select"
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                outline: 'none',
                minWidth: '250px',
                cursor: 'pointer'
              }}
            >
              {STATUT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <label htmlFor="periode-select" style={{ marginRight: '1rem', marginLeft: '2rem', fontWeight: 500, color: '#334155' }}>
              Période :
            </label>
            <select
              id="periode-select"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                outline: 'none',
                minWidth: '150px',
                cursor: 'pointer'
              }}
            >
              <option value="tout">Tout l'historique</option>
              <option value="annee">Cette année</option>
              <option value="mois">Ce mois</option>
              <option value="semaine">Cette semaine</option>
            </select>
          </div>
        </header>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Chargement des données...</p>
        ) : data && data.details.length > 0 ? (
          <>
            {/* Cartes de résumé */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
              <StatCard title="Dossiers concernés" value={data.total_dossiers} color="#3B82F6" />
              <StatCard title="Temps Moyen (Heures)" value={data.moyenne_heures} color="#8B5CF6" />
              <StatCard title="Temps Maximum (Heures)" value={data.max_heures} color="#E2000F" />
              <StatCard title="Temps Minimum (Heures)" value={data.min_heures > 0 && data.min_heures < 1 ? "< 1" : data.min_heures} color="#10B981" />
            </div>

            {/* Graphique détaillé */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#1E293B' }}>Temps passé par sinistre dans : {STATUT_OPTIONS.find(o => o.value === selectedStatut)?.label}</h3>
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.details} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="idSinistre" 
                      tick={{fill: '#64748B', fontSize: 12}} 
                      axisLine={false} 
                      tickLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      tick={{fill: '#64748B', fontSize: 12}} 
                      axisLine={false} 
                      tickLine={false} 
                      dx={-10} 
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                      formatter={(value, name, props) => [
                        `${value} heures ${props.payload.en_cours ? '(Toujours en cours)' : ''}`, 
                        'Durée'
                      ]}
                      labelFormatter={(label) => `Dossier: ${label}`}
                    />
                    <Bar 
                      dataKey="duree_heures" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]} 
                      barSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', color: '#64748B' }}>
            Aucun historique de sinistre trouvé pour cette étape.
          </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ 
      flex: 1, 
      background: 'white', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      borderLeft: `4px solid ${color}`
    }}>
      <p style={{ margin: '0 0 0.5rem 0', color: '#64748B', fontSize: '0.9rem', fontWeight: 500 }}>{title}</p>
      <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#0F172A' }}>{value}</p>
    </div>
  );
}
