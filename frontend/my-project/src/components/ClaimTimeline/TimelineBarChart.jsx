import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

/**
 * Custom Tooltip Component
 */
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '12px',
        border: '1px solid #f1f5f9',
        fontFamily: 'sans-serif'
      }}>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0' }}>
          Statut : <span style={{ fontWeight: 500, color: '#334155' }}>{label}</span>
        </p>
        <p style={{ fontSize: '16px', fontWeight: 500, color: '#0f172a', margin: 0 }}>
          Durée : {data.valeur} {unit} {data.en_cours ? '⏳' : '✅'}
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Timeline Bar Chart Component
 * @param {Array} data - Array of { statut, valeur, en_cours }
 * @param {string} unit - Current time unit ('minutes', 'heures', 'jours')
 */
export default function TimelineBarChart({ data, unit = 'heures' }) {
  if (!data || data.length === 0) {
    return <p style={{ color: '#64748b', textAlign: 'center', padding: '32px 0' }}>Aucune donnée de timeline disponible.</p>;
  }

  // Capitalize unit for YAxis label
  const unitLabel = unit.charAt(0).toUpperCase() + unit.slice(1);

  return (
    <div style={{ width: '100%', height: 350, minWidth: 500 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 0,
            bottom: 80,
          }}
        >
          {/* Faint dashed horizontal lines. No vertical lines */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          
          <XAxis
            dataKey="statut"
            tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
            axisLine={{ stroke: '#E2E8F0', strokeWidth: 1 }}
            tickLine={false}
            dy={8}
            dx={-6}
            height={70}
            interval={0}
            angle={-35}
            textAnchor="end"
          />
          
          <YAxis
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            dx={-10}
            label={{
              value: unitLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#94A3B8', fontSize: 13, fontWeight: 500 }
            }}
          />
          
          {/* Custom tooltip and hover effect */}
          <Tooltip
            content={<CustomTooltip unit={unit} />}
            cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} // faint light-gray fill on hover
          />
          
          <Bar dataKey="valeur" radius={[6, 6, 0, 0]} barSize={40}>
            {data.map((entry, index) => {
              // Pro-tip: Color bars RED if > 24 hours to highlight bottlenecks
              // Convert value back to hours for bottleneck check
              let hoursVal = entry.valeur;
              if (unit === 'minutes') hoursVal = entry.valeur / 60;
              if (unit === 'jours') hoursVal = entry.valeur * 24;
              
              const isBottleneck = hoursVal > 24;
              let barColor = "#f59e0b"; // Tailwind orange-500
              
              if (isBottleneck) {
                barColor = "#ef4444"; // Tailwind red-500
              } else if (entry.en_cours) {
                barColor = "#fbbf24"; // Lighter orange if still in progress and not bottleneck
              }
              
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={barColor}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
