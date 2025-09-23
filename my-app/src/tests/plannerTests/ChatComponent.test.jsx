import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatComponent from '../../pages/planner/ChatComponent';
import { vi } from 'vitest';

// ---- Mock Firebase Auth ----
vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('FAKE_TOKEN'),
    },
  }),
}));

// ---- Mock fetch ----
beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---- Helpers ----
const defaultProps = {
  plannerId: 'planner123',
  vendorId: 'vendor456',
  eventId: 'event789',
  currentUser: { id: 'u1', name: 'Alice', type: 'planner' },
  otherUser: { id: 'u2', name: 'Bob', type: 'vendor' },
  closeChat: vi.fn(),
};

beforeAll(() => {
  // Patch jsdom so scrollIntoView doesn’t explode
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});


describe('ChatComponent', () => {
  test('renders participants correctly', () => {
    render(<ChatComponent {...defaultProps} />);

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/\(planner\)/)).toBeInTheDocument();

    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/\(vendor\)/)).toBeInTheDocument();
  });

  test('fetches and displays messages on mount', async () => {
    const mockMessages = [
      {
        id: 'm1',
        senderId: 'u2',
        senderName: 'Bob',
        senderType: 'vendor',
        content: 'Hello Alice!',
        createdAt: new Date().toISOString(),
        status: 'delivered',
      },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: mockMessages }),
    });

    render(<ChatComponent {...defaultProps} />);

    // Wait for message to appear
    expect(await screen.findByText('Hello Alice!')).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test('sends a new message when submitted', async () => {
    // Mock fetch for initial load
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    render(<ChatComponent {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/Message Bob.../);
    const button = screen.getByRole('button', { name: /send message/i });

    // Type and send
    fireEvent.change(textarea, { target: { value: 'Hi Bob' } });
    fireEvent.click(button);

    // Expect POST request sent
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer FAKE_TOKEN',
          }),
          body: expect.stringContaining('Hi Bob'),
        })
      );
    });

    // Message should appear in UI
    expect(screen.getByText('Hi Bob')).toBeInTheDocument();

    // Status should eventually update to "delivered"
    await waitFor(() => {
      const deliveredIcons = screen.getAllByTestId(/lucide-icon/i);
      expect(deliveredIcons.length).toBeGreaterThan(0);
    });
  });

  test('calls closeChat when close button is clicked', () => {
    // Mock fetch for initial load
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    render(<ChatComponent {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    expect(defaultProps.closeChat).toHaveBeenCalledTimes(1);
  });
});
