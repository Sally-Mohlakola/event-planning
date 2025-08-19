import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { MemoryRouter } from 'react-router-dom' // <— import this
import Home from '../pages/Home'

test('renders sign-in success message', () => {
  render(
    <MemoryRouter> {/* <— wrap component in a router */}
      <Home />
    </MemoryRouter>
  )

  expect(
    screen.getByRole('heading', { name: /sign in works/i })
  ).toBeInTheDocument()
})
