import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Skeleton,
} from '@mui/material';
import { fetchAnnotations } from '@/api/annotations';
import type { Annotation } from '@/types';
import useNotificationStore from '@/stores/notificationStore';

export default function AnnotationsPage() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotificationStore((s) => s.show);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAnnotations();
        setAnnotations(data);
      } catch {
        notify('Failed to load annotations', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [notify]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Annotations
      </Typography>

      <TableContainer component={Paper} sx={{ background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(12px)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Species</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((__, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}
                </TableRow>
              ))
            ) : annotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No annotations found
                </TableCell>
              </TableRow>
            ) : (
              annotations.map((ann) => (
                <TableRow key={ann.id}>
                  <TableCell>{ann.name}</TableCell>
                  <TableCell>{ann.type}</TableCell>
                  <TableCell>{ann.species}</TableCell>
                  <TableCell>{ann.reference_id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                      {new Date(ann.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
