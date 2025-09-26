import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import PlannerContract from '../../pages/planner/PlannerContract';
import { auth } from '../../firebase';

// Mock Firebase auth
vi.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      uid: 'testUserId',
      getIdToken: () => Promise.resolve('fake-token')
    },
    onAuthStateChanged: vi.fn(callback => {
      callback({ uid: 'testUserId' });
      return () => {};
    })
  },
  db: {},
  storage: {
    ref: vi.fn(() => ({
      getDownloadURL: () => Promise.resolve('fake-url')
    }))
  }
}));

// Mock fetch
global.fetch = vi.fn();

// Sample test data
const mockEvents = [
  {
    id: '1',
    name: 'Wedding Event',
    date: { _seconds: 1735689600 }, // 2025-01-01
    clientName: 'John Doe',
    status: 'upcoming'
  }
];

const mockContracts = [
  {
    id: 'contract1',
    eventId: '1',
    eventName: 'Wedding Event',
    vendorId: 'vendor1',
    vendorName: 'Test Vendor',
    contractUrl: 'https://example.com/contract.pdf',
    fileName: 'contract.pdf',
    signatureFields: [
      {
        id: 'sig1',
        label: 'Client Signature',
        signerRole: 'client',
        required: true,
        position: { x: 100, y: 100, width: 200, height: 100 }
      }
    ],
    signatureWorkflow: {
      isElectronic: true,
      workflowStatus: 'sent'
    }
  }
];

describe('PlannerContract Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    fetch.mockReset();
    // Mock successful API responses
    fetch.mockImplementation((url) => {
      if (url.includes('/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: mockEvents })
        });
      }
      if (url.includes('/vendors')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ vendors: [{ id: 'vendor1', contracts: mockContracts }] })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  test('renders main components', async () => {
    render(<PlannerContract setActivePage={vi.fn()} />);

    expect(screen.getByText('Contract Management')).toBeInTheDocument();
    expect(screen.getByText('Manage vendor contracts for your events.')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Wedding Event')).toBeInTheDocument();
    });
  });

  test('handles search functionality', async () => {
    render(<PlannerContract setActivePage={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/Search by event name/i);
    await user.type(searchInput, 'Wedding');

    await waitFor(() => {
      expect(screen.getByText('Wedding Event')).toBeInTheDocument();
    });

    await user.clear(searchInput);
    await user.type(searchInput, 'NonExistent');

    await waitFor(() => {
      expect(screen.getByText('No events found matching "NonExistent"')).toBeInTheDocument();
    });
  });

  test('opens and closes signature modal', async () => {
    render(<PlannerContract setActivePage={vi.fn()} />);

    await waitFor(() => {
      const signButton = screen.getByText('Sign');
      fireEvent.click(signButton);
    });

    expect(screen.getByText('Sign Contract: contract.pdf')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(screen.queryByText('Sign Contract: contract.pdf')).not.toBeInTheDocument();
  });

  test('handles signature drawing and saving', async () => {
    render(<PlannerContract setActivePage={vi.fn()} />);

    await waitFor(() => {
      const signButton = screen.getByText('Sign');
      fireEvent.click(signButton);
    });

    const canvas = screen.getByRole('presentation');
    
    // Simulate drawing
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
    fireEvent.mouseUp(canvas);

    const saveDraftButton = screen.getByText('Save Draft');
    await user.click(saveDraftButton);

    await waitFor(() => {
      expect(screen.getByText('Draft saved successfully!')).toBeInTheDocument();
    });
  });

  test('handles contract deletion', async () => {
    window.confirm = vi.fn(() => true);
    
    render(<PlannerContract setActivePage={vi.fn()} />);

    await waitFor(() => {
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
    });

    expect(window.confirm).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(screen.getByText('Contract deleted successfully!')).toBeInTheDocument();
    });
  });

  test('handles download functionality', async () => {
    const mockCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tagName) => {
      const element = mockCreateElement(tagName);
      if (tagName === 'a') {
        element.click = vi.fn();
      }
      return element;
    });

    render(<PlannerContract setActivePage={vi.fn()} />);

    await waitFor(() => {
      const downloadButton = screen.getByText('Download');
      fireEvent.click(downloadButton);
    });

    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  test('handles API errors gracefully', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve({ ok: false }));

    render(<PlannerContract setActivePage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load events and contracts/i)).toBeInTheDocument();
    });
  });

  test('displays contract statistics correctly', async () => {
    render(<PlannerContract setActivePage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Total Contracts: 1')).toBeInTheDocument();
      expect(screen.getByText('Pending Contracts: 1')).toBeInTheDocument();
      expect(screen.getByText('Signed Contracts: 0')).toBeInTheDocument();
    });
  });

  test('finalizes contract signing', async () => {
    window.confirm = vi.fn(() => true);
    
    render(<PlannerContract setActivePage={vi.fn()} />);

    await waitFor(() => {
      const signButton = screen.getByText('Sign');
      fireEvent.click(signButton);
    });

    const finalizeButton = screen.getByText('Finalize & Update Contract');
    await user.click(finalizeButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/confirm-services'),
        expect.any(Object)
      );
    });
  });
});