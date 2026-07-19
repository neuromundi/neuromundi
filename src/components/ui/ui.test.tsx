import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from './StarRating';
import { EVSBadge } from './EVSBadge';

describe('StarRating', () => {
  it('llama onChange con el valor elegido (happy path)', async () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} label="Calidad" />);
    const fourth = screen.getByRole('radio', { name: /4 estrellas/i });
    await userEvent.click(fourth);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('en modo solo lectura no expone controles (error path)', () => {
    render(<StarRating value={4.2} label="Calidad" />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Calidad: 4.2 de 5/ })).toBeInTheDocument();
  });
});

describe('EVSBadge', () => {
  it('muestra el score con reseñas suficientes', () => {
    render(<EVSBadge score={4.7} totalReviews={42} />);
    expect(screen.getByText('4.7')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/EVS: 4.7 de 5, basada en 42 reseñas/),
    ).toBeInTheDocument();
  });

  it('marca "Nuevo" con pocas reseñas o sin score', () => {
    const { rerender } = render(<EVSBadge score={4.9} totalReviews={2} />);
    expect(screen.getByText(/Nuevo/)).toBeInTheDocument();

    rerender(<EVSBadge score={null} totalReviews={0} />);
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });
});
