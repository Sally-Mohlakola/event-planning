import '@testing-library/jest-dom'

import { vi } from 'vitest';


vi.mock('../src/firebase.js', () => ({
  auth: {
    currentUser: null,
  },
}));
