import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

const STEPS = [
  { id: 1, text: 'Inspecting schema & sample context...' },
  { id: 2, text: 'Generating pandas analysis code...' },
  { id: 3, text: 'Executing in safe AST sandbox...' },
  { id: 4, text: 'Synthesizing grounded natural language answer...' },
];

export default function SequentialLoader() {
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const timer1 = setTimeout(() => setActiveStep(2), 1200);
    const timer2 = setTimeout(() => setActiveStep(3), 2800);
    const timer3 = setTimeout(() => setActiveStep(4), 4800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm my-4 max-w-xl w-full">
      <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 mb-3.5">
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" aria-hidden="true" />
        <span>Analyzing dataset with pandas engine...</span>
      </div>

      <div className="space-y-2.5 pl-1">
        {STEPS.map((step) => {
          const isDone = activeStep > step.id;
          const isCurrent = activeStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex items-center space-x-2.5 text-xs md:text-sm transition-all duration-200 ${
                isDone
                  ? 'text-emerald-700 font-medium'
                  : isCurrent
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-400 font-normal'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300 shrink-0" aria-hidden="true" />
              )}
              <span>{step.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

