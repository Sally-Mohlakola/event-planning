import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import { vi } from 'vitest';


const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LandingPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders all role cards', () => {
    render(<LandingPage />, { wrapper: MemoryRouter });

    // Use heading role for specificity
    expect(screen.getByRole('heading', { name: 'Event Planners' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vendors' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Administrators' })).toBeInTheDocument();
  });

  it('navigates to login when navbar buttons are clicked', () => {
    render(<LandingPage />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');

    fireEvent.click(screen.getByText('Get Started')); // exact match avoids ambiguity
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('navigates to login when role card buttons are clicked', () => {
    render(<LandingPage />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByText('Get Started as an Event Planner'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');

    fireEvent.click(screen.getByText('Get Started as a Vendor'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');

    fireEvent.click(screen.getByText('Get Started as an Administrator'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('smooth scroll links exist', () => {
    render(<LandingPage />, { wrapper: MemoryRouter });

    expect(screen.getByText('Features').closest('a')).toHaveAttribute('href', '#features');
    expect(screen.getByText('Pricing').closest('a')).toHaveAttribute('href', '#pricing');
    expect(screen.getByText('Contact').closest('a')).toHaveAttribute('href', '#contact');
    expect(screen.getByText('Documentation').closest('a')).toHaveAttribute('href', '#documentation');
  });
});
