import React from 'react';
import './ClaimTimeline.css';

/**
 * Build the step list dynamically based on nature.
 */
function buildSteps(nature) {
  const steps = [
    { id: 'DECLARATION', label: 'Déclaration' },
    { id: 'EXPERTISE', label: 'Expertise' },
    { id: 'VALIDATION', label: 'Validé' },
  ];

  if (nature === 'VOL' || nature === 'ACTE_DE_SABOTAGE') {
    steps.push({ id: 'LEGAL', label: 'Légal' });
  }

  if (nature === 'INCENDIE') {
    steps.push({ id: 'HSE', label: 'HSE' });
  }

  steps.push(
    { id: 'CLOTURE', label: 'Clôturé' },
    { id: 'ARCHIVE', label: 'Archivé' },
  );

  return steps;
}

export default function ClaimTimeline({ currentStatus, nature }) {
  const steps = buildSteps(nature);

  let activeStepId = '';
  let isRejected = false;

  switch (currentStatus) {
    case 'OUVERT':
      activeStepId = 'EXPERTISE';
      break;
    case 'REJET_POUR_COMPLEMENT':
      activeStepId = 'EXPERTISE';
      isRejected = true;
      break;
    case 'EN_EXPERTISE':
      activeStepId = 'VALIDATION';
      break;
    case 'EN_VALIDATION_LEGAL':
      activeStepId = 'LEGAL';
      break;
    case 'EN_VALIDATION_HSE':
      activeStepId = 'HSE';
      break;
    case 'VALIDE':
    case 'ATTENTE_VALIDATION_FRANCHISE':
      activeStepId = 'CLOTURE';
      break;
    case 'CLOTURE':
    case 'CLOTURE_SOUS_FRANCHISE':
    case 'TRANSMIS_ASSUREUR':
      activeStepId = 'ARCHIVE';
      break;
    case 'ARCHIVE':
    case 'REJETE':
      activeStepId = 'DONE';
      break;
    default:
      activeStepId = 'EXPERTISE';
  }

  let activeIndex = steps.findIndex(s => s.id === activeStepId);
  if (activeStepId === 'DONE') {
    activeIndex = -1;
  }

  const completedUpToIndex = activeIndex === -1 ? steps.length - 1 : activeIndex - 1;

  // The progress bar should reach the active step (or the last completed step if DONE)
  const progressIndex = activeIndex === -1 ? steps.length - 1 : activeIndex;
  const progressPercent = progressIndex >= 0
    ? (progressIndex / (steps.length - 1)) * 100
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
          const isActive = index === activeIndex;
          const isCompleted = index <= completedUpToIndex;

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
