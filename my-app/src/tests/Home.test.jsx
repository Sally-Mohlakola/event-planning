import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Home from '../pages/Home'



test('renders home page with welcome message', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

  
  expect(screen.getByRole('heading', { name: /welcome to PLANiT/i })).toBeInTheDocument()

  
  expect(screen.getByRole('heading', { name: /choose your experience/i })).toBeInTheDocument()

  
})
