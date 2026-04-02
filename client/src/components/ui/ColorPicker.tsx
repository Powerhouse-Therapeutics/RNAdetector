import { useState } from 'react';
import {
  Box, TextField, Popover, Stack, Typography, IconButton, Tooltip,
} from '@mui/material';
import { Palette as PaletteIcon, Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';

const DEFAULT_SWATCHES = [
  // Row 1: primary colors
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E',
  // Row 2: muted/scientific
  '#1E3A5F', '#2D5F2D', '#8B4513', '#4A0E4E', '#2F4F4F',
  '#708090', '#B8860B', '#556B2F', '#4682B4', '#CD853F',
  '#6B8E23', '#483D8B', '#BC8F8F', '#5F9EA0', '#D2691E',
  '#9ACD32', '#FF6347',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  size?: 'small' | 'medium';
}

export default function ColorPicker({ value, onChange, label, size = 'small' }: ColorPickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [hexInput, setHexInput] = useState(value);

  const handleHexChange = (hex: string) => {
    setHexInput(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  const handleSwatchClick = (color: string) => {
    setHexInput(color);
    onChange(color);
  };

  const dim = size === 'small' ? 28 : 36;

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {label && (
        <Typography variant="caption" sx={{ color: '#8B949E', minWidth: 60, fontSize: '0.78rem' }}>
          {label}
        </Typography>
      )}
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          width: dim,
          height: dim,
          borderRadius: '6px',
          bgcolor: value,
          border: '2px solid #30363D',
          cursor: 'pointer',
          transition: 'all 200ms ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          '&:hover': {
            borderColor: '#58A6FF',
            transform: 'scale(1.08)',
            boxShadow: `0 0 0 3px ${value}30`,
          },
        }}
      />
      <TextField
        value={hexInput}
        onChange={(e) => handleHexChange(e.target.value)}
        size="small"
        sx={{
          width: 100,
          '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#30363D',
              transition: 'border-color 200ms ease',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#58A6FF',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#58A6FF',
            },
          },
          '& .MuiInputBase-input': {
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.78rem',
            py: 0.5,
            px: 1,
            color: '#C9D1D9',
          },
        }}
        placeholder="#FF0000"
      />
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 2.5,
              mt: 1,
              background: '#161B22',
              border: '1px solid #21262D',
              borderRadius: '12px',
              maxWidth: 290,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            },
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            mb: 1.5,
            display: 'block',
            color: '#8B949E',
            fontWeight: 500,
            fontSize: '0.75rem',
            letterSpacing: '0.02em',
          }}
        >
          Select a color
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {DEFAULT_SWATCHES.map((color) => (
            <Tooltip key={color} title={color} placement="top" arrow>
              <Box
                onClick={() => { handleSwatchClick(color); setAnchorEl(null); }}
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '5px',
                  bgcolor: color,
                  cursor: 'pointer',
                  border: value === color
                    ? '2px solid #fff'
                    : '2px solid transparent',
                  transition: 'all 150ms ease',
                  '&:hover': {
                    transform: 'scale(1.15)',
                    boxShadow: `0 0 0 2px ${color}40`,
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                }}
              />
            </Tooltip>
          ))}
        </Box>
        <Box
          sx={{
            pt: 1.5,
            borderTop: '1px solid #21262D',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: '#484F58', fontWeight: 500 }}>
              Hex:
            </Typography>
            <TextField
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              size="small"
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#30363D',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#58A6FF',
                  },
                },
                '& .MuiInputBase-input': {
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.78rem',
                  py: 0.5,
                  color: '#C9D1D9',
                },
              }}
            />
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '5px',
                bgcolor: value,
                border: '1px solid #30363D',
                flexShrink: 0,
              }}
            />
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}

interface ColorGroupEditorProps {
  groups: { name: string; color: string }[];
  onChange: (groups: { name: string; color: string }[]) => void;
}

export function ColorGroupEditor({ groups, onChange }: ColorGroupEditorProps) {
  const updateColor = (index: number, color: string) => {
    const updated = [...groups];
    updated[index] = { ...updated[index], color };
    onChange(updated);
  };

  const updateName = (index: number, name: string) => {
    const updated = [...groups];
    updated[index] = { ...updated[index], name };
    onChange(updated);
  };

  const addGroup = () => {
    const palette = DEFAULT_SWATCHES;
    onChange([...groups, { name: `Group ${groups.length + 1}`, color: palette[groups.length % palette.length] }]);
  };

  const removeGroup = (index: number) => {
    onChange(groups.filter((_, i) => i !== index));
  };

  return (
    <Box
      sx={{
        p: 2.5,
        background: '#161B22',
        borderRadius: '12px',
        border: '1px solid #21262D',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: '#C9D1D9',
          fontWeight: 600,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '6px',
            background: 'rgba(88, 166, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PaletteIcon sx={{ fontSize: 16, color: '#58A6FF' }} />
        </Box>
        Group Colors
      </Typography>
      <Stack spacing={1.5}>
        {groups.map((group, i) => (
          <Stack
            key={i}
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{
              p: 1,
              borderRadius: '8px',
              bgcolor: '#0D1117',
              border: '1px solid #21262D',
              transition: 'border-color 200ms ease',
              '&:hover': { borderColor: '#30363D' },
            }}
          >
            <Box
              sx={{
                width: 4,
                height: 28,
                borderRadius: 2,
                bgcolor: group.color,
                flexShrink: 0,
              }}
            />
            <TextField
              value={group.name}
              onChange={(e) => updateName(i, e.target.value)}
              size="small"
              sx={{
                width: 160,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#30363D',
                    transition: 'border-color 200ms ease',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#58A6FF',
                  },
                },
                '& .MuiInputBase-input': { fontSize: '0.85rem', py: 0.5, color: '#C9D1D9' },
              }}
              placeholder="Group name"
            />
            <ColorPicker value={group.color} onChange={(c) => updateColor(i, c)} />
            <IconButton
              size="small"
              onClick={() => removeGroup(i)}
              sx={{
                color: '#484F58',
                transition: 'all 200ms ease',
                '&:hover': {
                  color: '#F85149',
                  bgcolor: 'rgba(248, 81, 73, 0.1)',
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        ))}
        <Box sx={{ pt: 0.5 }}>
          <IconButton
            onClick={addGroup}
            size="small"
            sx={{
              color: '#58A6FF',
              border: '1px dashed rgba(88, 166, 255, 0.3)',
              borderRadius: '8px',
              px: 2,
              py: 0.5,
              transition: 'all 200ms ease',
              '&:hover': {
                bgcolor: 'rgba(88, 166, 255, 0.08)',
                borderColor: '#58A6FF',
              },
            }}
          >
            <AddIcon sx={{ fontSize: 16, mr: 0.5 }} />
            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.78rem' }}>
              Add group
            </Typography>
          </IconButton>
        </Box>
      </Stack>
    </Box>
  );
}
