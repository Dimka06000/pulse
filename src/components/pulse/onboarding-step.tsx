'use client';

import { useEffect, useState } from 'react';

interface OnboardingStepProps {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}

export function OnboardingStep({ step, totalSteps, children }: OnboardingStepProps) {
  const [visible, setVisible] = useState(true);
  const [prevStep, setPrevStep] = useState(step);

  // Only animate on step changes, not on initial mount
  if (step !== prevStep) {
    setPrevStep(step);
    setVisible(false);
  }

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      {/* Progress dots */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={[
              'h-2.5 rounded-full transition-all duration-500',
              i === step
                ? 'w-8 bg-gradient-to-r from-brand-500 to-cyan-500'
                : i < step
                  ? 'w-2.5 bg-brand-500'
                  : 'w-2.5 bg-white/20',
            ].join(' ')}
          />
        ))}
      </div>

      {/* Content with fade+slide */}
      <div
        className={[
          'w-full max-w-lg transition-all duration-500 ease-out',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}
