import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Stack, Alert, Fade } from '@mui/material';
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Send as SubmitIcon,
} from '@mui/icons-material';
import WizardStepper from '@/components/ui/WizardStepper';

export interface StepConfig {
  label: string;
  content: React.ReactNode;
  validate?: () => boolean | string;
}

interface AnalysisWizardProps {
  steps: StepConfig[];
  onSubmit: (data: any) => void;
  submitting?: boolean;
}

export default function AnalysisWizard({ steps, onSubmit, submitting = false }: AnalysisWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const isLastStep = activeStep === steps.length - 1;

  // Scroll content area into view on step change
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeStep]);

  const transitionStep = (nextStep: number, dir: 'forward' | 'back') => {
    setDirection(dir);
    setVisible(false);
    setAnimating(true);
    setTimeout(() => {
      setActiveStep(nextStep);
      setVisible(true);
      setAnimating(false);
    }, 150);
  };

  const handleNext = () => {
    setError(null);
    const step = steps[activeStep];
    if (step.validate) {
      const result = step.validate();
      if (result !== true) {
        setError(typeof result === 'string' ? result : 'Please complete all required fields.');
        return;
      }
    }

    if (isLastStep) {
      onSubmit(null);
    } else {
      transitionStep(activeStep + 1, 'forward');
    }
  };

  const handleBack = () => {
    setError(null);
    transitionStep(activeStep - 1, 'back');
  };

  return (
    <Box>
      <WizardStepper steps={steps.map((s) => s.label)} activeStep={activeStep} />

      {error && (
        <Fade in>
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: '8px',
              bgcolor: 'rgba(248, 81, 73, 0.1)',
              border: '1px solid rgba(248, 81, 73, 0.2)',
              '& .MuiAlert-icon': { color: '#F85149' },
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        </Fade>
      )}

      <Box
        ref={contentRef}
        sx={{
          minHeight: 300,
          mb: 4,
          opacity: visible ? 1 : 0,
          transform: visible
            ? 'translateX(0)'
            : direction === 'forward'
            ? 'translateX(12px)'
            : 'translateX(-12px)',
          transition: 'opacity 200ms ease, transform 200ms ease',
        }}
      >
        {steps[activeStep].content}
      </Box>

      <Stack
        direction="row"
        justifyContent="space-between"
        sx={{
          pt: 3,
          borderTop: '1px solid #21262D',
        }}
      >
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || animating}
          startIcon={<BackIcon />}
          sx={{
            color: '#8B949E',
            fontWeight: 500,
            borderRadius: '8px',
            px: 2.5,
            py: 1,
            transition: 'all 200ms ease',
            '&:hover': {
              bgcolor: '#21262D',
              color: '#C9D1D9',
            },
            '&.Mui-disabled': {
              color: '#484F58',
            },
          }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          endIcon={isLastStep ? <SubmitIcon /> : <NextIcon />}
          disabled={submitting || animating}
          sx={{
            fontWeight: 600,
            borderRadius: '8px',
            px: 3,
            py: 1,
            transition: 'all 200ms ease',
            ...(isLastStep
              ? {
                  background: 'linear-gradient(135deg, #3FB950, #2EA043)',
                  boxShadow: '0 2px 8px rgba(63, 185, 80, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4ACA5B, #3FB950)',
                    boxShadow: '0 4px 12px rgba(63, 185, 80, 0.4)',
                  },
                }
              : {
                  background: 'linear-gradient(135deg, #58A6FF, #388BFD)',
                  boxShadow: '0 2px 8px rgba(88, 166, 255, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #79B8FF, #58A6FF)',
                    boxShadow: '0 4px 12px rgba(88, 166, 255, 0.4)',
                  },
                }),
            '&.Mui-disabled': {
              background: '#21262D',
              color: '#484F58',
              boxShadow: 'none',
            },
          }}
        >
          {isLastStep ? (submitting ? 'Submitting...' : 'Submit Analysis') : 'Continue'}
        </Button>
      </Stack>
    </Box>
  );
}
