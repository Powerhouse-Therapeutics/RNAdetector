import {
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  stepConnectorClasses,
  styled,
} from '@mui/material';

const CyanConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: '#00E5FF',
      boxShadow: '0 0 8px rgba(0, 229, 255, 0.4)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: '#10B981',
      boxShadow: '0 0 6px rgba(16, 185, 129, 0.3)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    borderColor: 'rgba(0, 229, 255, 0.2)',
    borderTopWidth: 2,
    transition: 'all 0.3s ease',
  },
}));

interface WizardStepperProps {
  steps: string[];
  activeStep: number;
}

export default function WizardStepper({ steps, activeStep }: WizardStepperProps) {
  return (
    <Stepper activeStep={activeStep} connector={<CyanConnector />} sx={{ mb: 4 }}>
      {steps.map((label) => (
        <Step key={label}>
          <StepLabel
            sx={{
              '& .MuiStepLabel-label': {
                color: 'text.secondary',
                '&.Mui-active': { color: '#00E5FF', fontWeight: 600 },
                '&.Mui-completed': { color: '#10B981' },
              },
            }}
          >
            {label}
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
