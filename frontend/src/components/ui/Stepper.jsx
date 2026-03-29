import React from 'react';

/**
 * Reusable Stepper Component
 * Displays multi-step progress indicator
 */

const STEP_STATUS = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in-progress',
  PENDING: 'pending',
};

const STATUS_LABELS = {
  [STEP_STATUS.COMPLETED]: '✓ Completed',
  [STEP_STATUS.IN_PROGRESS]: 'In Progress',
  [STEP_STATUS.PENDING]: 'Pending',
};

export const Stepper = ({ steps, currentStep, onStepClick }) => {
  const getStepStatus = (stepNum) => {
    if (currentStep > stepNum) return STEP_STATUS.COMPLETED;
    if (currentStep === stepNum) return STEP_STATUS.IN_PROGRESS;
    return STEP_STATUS.PENDING;
  };

  const handleStepClick = (stepNum) => {
    // Only allow clicking completed steps
    if (currentStep > stepNum && onStepClick) {
      onStepClick(stepNum);
    }
  };

  return (
    <div className="step-indicator">
      {steps.map((step) => {
        const status = getStepStatus(step.num);
        const isClickable = currentStep > step.num;

        return (
          <div key={step.num} className={`step-item ${status}`}>
            <div className="step-column">
              <div
                className={`step-dot ${status}`}
                onClick={() => handleStepClick(step.num)}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <span className="material-symbols-rounded step-icon">
                  {step.icon}
                </span>
              </div>
              <div className="step-info">
                <div className="step-title">
                  <strong>STEP {step.num}</strong>
                  <h4>{step.label}</h4>
                </div>
                <div className={`step-status ${status}`}>
                  {STATUS_LABELS[status]}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
