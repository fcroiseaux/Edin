'use client';

import { useMutation } from '@tanstack/react-query';
import type { CalculatorInput, CalculatorResult } from '@edin/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CalculatorResponse {
  data: CalculatorResult;
  meta: { timestamp: string; correlationId: string };
}

async function fetchCalculation(input: CalculatorInput): Promise<CalculatorResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/rewards/methodology/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message || `API error: ${response.status}`);
  }

  const body: CalculatorResponse = await response.json();
  return body.data;
}

export function useMethodologyCalculator() {
  return useMutation({
    mutationFn: fetchCalculation,
  });
}
