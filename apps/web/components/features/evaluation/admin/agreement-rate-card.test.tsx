import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgreementRateCard } from './agreement-rate-card';
import type { AgreementRatesResponseDto } from '@edin/shared';

const mockRates: AgreementRatesResponseDto = {
  overall: { totalReviewed: 10, confirmed: 7, overridden: 3, agreementRate: 70 },
  byModel: [
    {
      modelId: 'model-1',
      modelVersion: 'v1.0',
      totalReviewed: 10,
      confirmed: 7,
      overridden: 3,
      agreementRate: 70,
    },
  ],
  byDomain: [
    { domain: 'TECHNOLOGY', totalReviewed: 6, confirmed: 5, overridden: 1, agreementRate: 83 },
    { domain: 'FINTECH', totalReviewed: 4, confirmed: 2, overridden: 2, agreementRate: 50 },
  ],
};

describe('AgreementRateCard', () => {
  it('renders overall agreement rate', () => {
    render(<AgreementRateCard rates={mockRates} isLoading={false} />);

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText(/alignment.*10 reviews/)).toBeInTheDocument();
  });

  it('shows confirmed and overridden counts', () => {
    render(<AgreementRateCard rates={mockRates} isLoading={false} />);

    expect(screen.getByText(/7 confirmed/)).toBeInTheDocument();
    expect(screen.getByText(/3 overridden/)).toBeInTheDocument();
  });

  it('shows domain breakdown', () => {
    render(<AgreementRateCard rates={mockRates} isLoading={false} />);

    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Fintech')).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows empty state when no reviews', () => {
    const emptyRates: AgreementRatesResponseDto = {
      overall: { totalReviewed: 0, confirmed: 0, overridden: 0, agreementRate: 0 },
      byModel: [],
      byDomain: [],
    };

    render(<AgreementRateCard rates={emptyRates} isLoading={false} />);

    expect(screen.getByText(/No human reviews completed yet/)).toBeInTheDocument();
  });

  it('shows empty state when rates is null', () => {
    render(<AgreementRateCard rates={null} isLoading={false} />);

    expect(screen.getByText(/No human reviews completed yet/)).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    const { container } = render(<AgreementRateCard rates={null} isLoading={true} />);

    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });
});
