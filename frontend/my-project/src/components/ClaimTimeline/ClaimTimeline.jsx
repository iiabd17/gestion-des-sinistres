import React from 'react';
import './ClaimTimeline.css';

const ALL_STEPS = [
  { id: 'OUVERT', label: 'Déclaration' },
  { id: 'EN_EXPERTISE', label: 'Expertise' },
  { id: 'EN_VALIDATION_LEGAL', label: 'Légal' },
  { id: 'EN_VALIDATION_HSE', label: 'HSE' },
  { id: 'TRANSMIS_ASSUREUR', label: 'Transmis' },
  { id: 'VALIDE', label: 'Validé' },
  { id: 'CLOTURE', label: 'Clôturé' },
  { id: 'ARCHIVE', label: 'Archivé' },
];

// Map alternative statuses to the main ones for the timeline
const STATUS_MAP = {
  'REJET_POUR_COMPLEMENT': 'OUVERT',
  'ATTENTE_VALIDATION_FRANCHISE': 'VALIDE',
  'CLOTURE_SOUS_FRANCHISE': 'CLOTURE',
  'REJETE': 'VALIDE', // We show it at the 'Validé/Rejeté' step
};

export default function ClaimTimeline({ currentStatus }) {
  const getStepIndex = (status) => {
    const mappedStatus = STATUS_MAP[status] || status;
    return ALL_STEPS.findIndex(s => s.id === mappedStatus);
  };

  const currentIndex = getStepIndex(currentStatus);
  const progressPercent = (currentIndex / (ALL_STEPS.length - 1)) * 90 + 5;

  return (
    <div className="timeline-container">
      <div className="timeline-steps">
        <div className="timeline-progress-bar">
          <div 
            className="timeline-progress-fill" 
            style={{ width: `${currentIndex >= 0 ? progressPercent : 0}%` }} 
          />
        </div>
        
        {ALL_STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isPending = index > currentIndex;

          return (
            <div 
              key={step.id} 
              className={`timeline-step ${isActive ? 'timeline-step--active' : ''} ${isCompleted ? 'timeline-step--completed' : ''}`}
            >
              <div className="timeline-dot">
                {isCompleted ? (
                  <IconCheck className="timeline-icon" />
                ) : (
                  <span style={{ fontSize: '12px' }}>{index + 1}</span>
                )}
              </div>
              <span className="timeline-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconCheck({ className }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
