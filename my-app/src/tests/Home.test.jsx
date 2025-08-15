import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Home from '../pages/Home'
import Login from '../pages/Login'


test('renders sign-in success message', () => {
  render(<Home />);
  expect(screen.getByRole('heading', { name: /sign in works/i })).toBeInTheDocument();
});

