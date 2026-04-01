import React, { useState } from 'react';
import { Box, Button, Stack, Alert } from '@mui/material';
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

  const isLastStep = activeStep === steps.length - 1;

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
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  return (
    <Box>
      <WizardStepper steps={steps.map((s) => s.label)} activeStep={activeStep} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ minHeight: 300, mb: 4 }}>{steps[activeStep].content}</Box>

      <Stack direction="row" justifyContent="space-between">
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<BackIcon />}
          color="inherit"
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          endIcon={isLastStep ? <SubmitIcon /> : <NextIcon />}
          disabled={submitting}
        >
          {isLastStep ? (submitting ? 'Submitting...' : 'Submit') : 'Next'}
        </Button>
      </Stack>
    </Box>
  );
}
