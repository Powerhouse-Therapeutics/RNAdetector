import { useState } from 'react';
import {
  Box, TextField, Popover, Stack, Typography, IconButton, Tooltip,
} from '@mui/material';
import { Palette as PaletteIcon } from '@mui/icons-material';

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

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
          {label}
        </Typography>
      )}
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          width: size === 'small' ? 28 : 36,
          height: size === 'small' ? 28 : 36,
          borderRadius: 1,
          bgcolor: value,
          border: '2px solid rgba(255,255,255,0.2)',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          '&:hover': { borderColor: 'rgba(0, 229, 255, 0.5)' },
        }}
      />
      <TextField
        value={hexInput}
        onChange={(e) => handleHexChange(e.target.value)}
        size="small"
        sx={{
          width: 100,
          '& .MuiInputBase-input': {
            fontFamily: 'JetBrains Mono',
            fontSize: '0.8rem',
            py: 0.5,
            px: 1,
          },
        }}
        placeholder="#FF0000"
      />
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              background: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(0, 229, 255, 0.15)',
              maxWidth: 280,
            },
          },
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Select a color
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
          {DEFAULT_SWATCHES.map((color) => (
            <Tooltip key={color} title={color} placement="top">
              <Box
                onClick={() => { handleSwatchClick(color); setAnchorEl(null); }}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 0.5,
                  bgcolor: color,
                  cursor: 'pointer',
                  border: value === color ? '2px solid #fff' : '2px solid transparent',
                  transition: 'transform 0.15s, border-color 0.15s',
                  '&:hover': { transform: 'scale(1.2)', borderColor: 'rgba(255,255,255,0.5)' },
                }}
              />
            </Tooltip>
          ))}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">Hex:</Typography>
          <TextField
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            size="small"
            sx={{
              flex: 1,
              '& .MuiInputBase-input': {
                fontFamily: 'JetBrains Mono',
                fontSize: '0.8rem',
                py: 0.5,
              },
            }}
          />
          <Box sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: value }} />
        </Stack>
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
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PaletteIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        Group Colors
      </Typography>
      <Stack spacing={1}>
        {groups.map((group, i) => (
          <Stack key={i} direction="row" alignItems="center" spacing={1}>
            <TextField
              value={group.name}
              onChange={(e) => updateName(i, e.target.value)}
              size="small"
              sx={{
                width: 160,
                '& .MuiInputBase-input': { fontSize: '0.85rem', py: 0.5 },
              }}
              placeholder="Group name"
            />
            <ColorPicker value={group.color} onChange={(c) => updateColor(i, c)} />
            <IconButton size="small" onClick={() => removeGroup(i)} sx={{ color: 'error.main', opacity: 0.6, '&:hover': { opacity: 1 } }}>
              <Typography variant="body2">×</Typography>
            </IconButton>
          </Stack>
        ))}
        <Box>
          <Typography
            variant="caption"
            onClick={addGroup}
            sx={{
              color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' },
            }}
          >
            + Add group
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
