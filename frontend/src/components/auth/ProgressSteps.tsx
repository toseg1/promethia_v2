import React from 'react';

interface ProgressStepsProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export function ProgressSteps({ currentStep, totalSteps, steps }: ProgressStepsProps) {
  return (
    <div className="progress-steps">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <React.Fragment key={stepNumber}>
            {/* Step */}
            <div className="progress-step">
              <div className={`progress-step-circle ${
                isActive ? 'active' : isCompleted ? 'completed' : ''
              }`}>
                {isCompleted ? '✓' : stepNumber}
              </div>
              <div className="progress-step-label">
                {step}
              </div>
            </div>
            
            {/* Connector - Don't show after last step */}
            {index < steps.length - 1 && (
              <div className={`progress-step-connector ${
                isCompleted ? 'completed' : ''
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}