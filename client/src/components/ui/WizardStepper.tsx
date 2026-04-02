import {
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  stepConnectorClasses,
  StepIconProps,
  styled,
  Box,
  Typography,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';

const AppleConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 18,
    left: 'calc(-50% + 20px)',
    right: 'calc(50% + 20px)',
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: 'linear-gradient(90deg, #58A6FF 0%, #58A6FF 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      background: 'linear-gradient(90deg, #3FB950 0%, #58A6FF 100%)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 2,
    border: 0,
    backgroundColor: '#30363D',
    borderRadius: 1,
    transition: 'background 0.4s ease',
  },
}));

function AppleStepIcon(props: StepIconProps) {
  const { active, completed, icon } = props;

  return (
    <Box
      sx={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 200ms ease',
        ...(completed && {
          background: 'linear-gradient(135deg, #3FB950, #2EA043)',
          boxShadow: '0 2px 8px rgba(63, 185, 80, 0.2)',
        }),
        ...(active && {
          background: 'linear-gradient(135deg, #58A6FF, #388BFD)',
          boxShadow: '0 2px 8px rgba(88, 166, 255, 0.25)',
        }),
        ...(!active && !completed && {
          background: '#21262D',
          border: '2px solid #30363D',
        }),
      }}
    >
      {completed ? (
        <CheckIcon sx={{ fontSize: 18, color: '#fff' }} />
      ) : (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: '0.8rem',
            color: active ? '#fff' : '#8B949E',
            lineHeight: 1,
          }}
        >
          {icon}
        </Typography>
      )}
    </Box>
  );
}

interface WizardStepperProps {
  steps: string[];
  activeStep: number;
}

export default function WizardStepper({ steps, activeStep }: WizardStepperProps) {
  return (
    <Stepper
      activeStep={activeStep}
      alternativeLabel
      connector={<AppleConnector />}
      sx={{
        mb: 5,
        py: 2,
        px: 1,
        background: '#161B22',
        borderRadius: '12px',
        border: '1px solid #21262D',
      }}
    >
      {steps.map((label) => (
        <Step key={label}>
          <StepLabel
            StepIconComponent={AppleStepIcon}
            sx={{
              '& .MuiStepLabel-label': {
                color: '#8B949E',
                fontSize: '0.8rem',
                fontWeight: 500,
                mt: 1,
                transition: 'all 200ms ease',
                '&.Mui-active': { color: '#58A6FF', fontWeight: 600 },
                '&.Mui-completed': { color: '#3FB950', fontWeight: 500 },
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
