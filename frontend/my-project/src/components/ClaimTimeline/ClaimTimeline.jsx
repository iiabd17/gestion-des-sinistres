import React from 'react';
import './ClaimTimeline.css';

/**
 * Build the step list dynamically based on nature.
 * Legal step only for VOL / ACTE_DE_SABOTAGE.
 * HSE step only for INCENDIE.
 */
function buildSteps(nature) {
  const steps = [
    { id: 'OUVERT', label: 'Déclaration' },
    { id: 'EN_EXPERTISE', label: 'Expertise' },
  ];

  if (nature === 'VOL' || nature === 'ACTE_DE_SABOTAGE') {
    steps.push({ id: 'EN_VALIDATION_LEGAL', label: 'Légal' });
  }

  if (nature === 'INCENDIE') {
    steps.push({ id: 'EN_VALIDATION_HSE', label: 'HSE' });
  }

  steps.push(
    { id: 'VALIDE', label: 'Validé' },
    { id: 'TRANSMIS_ASSUREUR', label: 'Transmis' },
    { id: 'CLOTURE', label: 'Clôturé' },
  );

  return steps;
}

// Map alternative statuses to the main ones for the timeline
const STATUS_MAP = {
  'REJET_POUR_COMPLEMENT': 'EN_EXPERTISE',
  'ATTENTE_VALIDATION_FRANCHISE': 'VALIDE',
  'CLOTURE_SOUS_FRANCHISE': 'CLOTURE',
  'REJETE': 'VALIDE',
  'ARCHIVE': 'CLOTURE',
};

// Statuses that represent a "rejected / complement" loop
const REJECTED_STATUSES = ['REJET_POUR_COMPLEMENT'];

export default function ClaimTimeline({ currentStatus, nature }) {
  const steps = buildSteps(nature);

  const getStepIndex = (status) => {
    const mappedStatus = STATUS_MAP[status] || status;
    return steps.findIndex(s => s.id === mappedStatus);
  };

  const currentIndex = getStepIndex(currentStatus);
  const isRejected = REJECTED_STATUSES.includes(currentStatus);
  const progressPercent = currentIndex >= 0
    ? (currentIndex / (steps.length - 1)) * 90 + 5
    : 0;

  return (
    <div className="timeline-container">
      <div className="timeline-steps">
        <div className="timeline-progress-bar">
          <div 
            className={`timeline-progress-fill ${isRejected ? 'timeline-progress-fill--rejected' : ''}`}
            style={{ width: `${progressPercent}%` }} 
          />
        </div>
        
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          let stepClass = 'timeline-step';
          if (isActive && isRejected) {
            stepClass += ' timeline-step--rejected';
          } else if (isActive) {
            stepClass += ' timeline-step--active';
          } else if (isCompleted) {
            stepClass += ' timeline-step--completed';
          }

          return (
            <div key={step.id} className={stepClass}>
              <div className="timeline-dot">
                {isCompleted ? (
                  <IconCheck className="timeline-icon" />
                ) : isActive && isRejected ? (
                  <IconReturn className="timeline-icon" />
                ) : (
                  <span style={{ fontSize: '12px' }}>{index + 1}</span>
                )}
              </div>
              <span className="timeline-label">{step.label}</span>
              {isActive && isRejected && (
                <span className="timeline-rejected-tag">À compléter</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconCheck({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconReturn({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
