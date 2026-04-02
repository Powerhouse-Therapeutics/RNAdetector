import { useEffect, useState, useRef } from 'react';
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

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    const load = async () => {
      try {
        const data = await fetchAnnotations(signal);
        if (!signal.aborted) {
          setAnnotations(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!signal.aborted) notify('Failed to load annotations', 'error');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };
    load();

    return () => { abortRef.current?.abort(); };
  }, [notify]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Annotations
      </Typography>

      <TableContainer component={Paper} sx={{ background: '#161B22' }}>
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
