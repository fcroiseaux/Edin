'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MAX_RECONNECT_DELAY = 30_000;
const RECONNECTING_THRESHOLD = 5_000;

export function useContributionSse() {
  const queryClient = useQueryClient();
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let disposed = false;

    function connect() {
      if (disposed) return;

      const token = getAccessToken();
      if (!token) return;

      // EventSource doesn't support Authorization headers, so pass token as query param
      const url = `${API_BASE_URL}/api/v1/contributors/me/contributions/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url, { withCredentials: true });
      eventSource = es;

      es.onopen = () => {
        reconnectAttempt = 0;
        setIsReconnecting(false);
      };

      es.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ['contributions', 'me'] });
      };

      es.onerror = () => {
        es.close();
        eventSource = null;

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY);
        reconnectAttempt += 1;

        if (delay >= RECONNECTING_THRESHOLD) {
          setIsReconnecting(true);
        }

        reconnectTimeout = setTimeout(() => {
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [queryClient]);

  return { isReconnecting };
}
