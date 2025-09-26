import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Home from '../pages/Home'

vi.mock("firebase/app", () => {
  return {
    initializeApp: vi.fn(() => ({})), // fake app object
  };
});

vi.mock("firebase/auth", () => {
  return {
    getAuth: vi.fn(() => ({})),
    onAuthStateChanged: vi.fn((auth, cb) => {
      cb(null); // simulate logged out
      return vi.fn();
    }),
  };
});



test('renders home page with welcome message', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

  
  expect(screen.getByRole('heading', { name: /welcome to PLANiT/i })).toBeInTheDocument()

  
  expect(screen.getByRole('heading', { name: /choose your experience/i })).toBeInTheDocument()

  
})
