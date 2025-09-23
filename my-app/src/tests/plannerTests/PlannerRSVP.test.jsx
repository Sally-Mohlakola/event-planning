import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PlannerRSVP from '../../pages/planner/PlannerRSVP';
import userEvent from '@testing-library/user-event';

// Mock fetch
global.fetch = vi.fn();

// Mock window.location
const mockLocation = new URL('http://localhost:3000/rsvp/event123/guest456/accept');
delete window.location;
window.location = mockLocation;

// Sample test data
const mockEventData = {
  event: {
    name: 'Wedding Ceremony',
    date: '2025-12-25T18:00:00.000Z'
  },
  guest: {
    firstname: 'John',
    email: 'john@example.com'
  }
};

describe('PlannerRSVP Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    fetch.mockReset();
    // Reset location pathname
    window.location.pathname = '/rsvp/event123/guest456/accept';
  });

  test('renders loading state initially', () => {
    render(<PlannerRSVP />);
    expect(screen.getByText('Processing your RSVP...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we update your response.')).toBeInTheDocument();
  });

  test('handles successful accept RSVP', async () => {
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEventData)
      })
    );

    render(<PlannerRSVP />);

    await waitFor(() => {
      expect(screen.getByText('RSVP Confirmed!')).toBeInTheDocument();
      expect(screen.getByText('Wedding Ceremony')).toBeInTheDocument();
      expect(screen.getByText("Thank you, John! We're excited to have you join us.")).toBeInTheDocument();
      expect(screen.getByText('A confirmation email has been sent to john@example.com.')).toBeInTheDocument();
    });
  });

  test('handles successful decline RSVP', async () => {
    window.location.pathname = '/rsvp/event123/guest456/decline';
    
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEventData)
      })
    );

    render(<PlannerRSVP />);

    await waitFor(() => {
      expect(screen.getByText('Response Received')).toBeInTheDocument();
      expect(screen.getByText("Thank you for your response, John. We're sorry you won't be able to join us.")).toBeInTheDocument();
      expect(screen.getByText('If your plans change, please feel free to contact the event organizer.')).toBeInTheDocument();
    });
  });

  test('handles invalid URL format', async () => {
    window.location.pathname = '/rsvp/invalid';
    
    render(<PlannerRSVP />);

    await waitFor(() => {
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Invalid RSVP URL format')).toBeInTheDocument();
    });
  });

  test('handles API error response', async () => {
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found')
      })
    );

    render(<PlannerRSVP />);

    await waitFor(() => {
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Failed to process RSVP: 404')).toBeInTheDocument();
    });
  });

  test('handles invalid RSVP response type', async () => {
    window.location.pathname = '/rsvp/event123/guest456/invalid';
    
    render(<PlannerRSVP />);

    await waitFor(() => {
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Invalid RSVP response')).toBeInTheDocument();
    });
  });

  test('retry button reloads the page', async () => {
    window.location.reload = vi.fn();
    window.location.pathname = '/rsvp/invalid';
    
    render(<PlannerRSVP />);

    await waitFor(() => {
      const retryButton = screen.getByText('Try Again');
      userEvent.click(retryButton);
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  test('handles missing URL parameters', async () => {
    window.location.pathname = '/rsvp';
    
    render(<PlannerRSVP />);

    await waitFor(() => {
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Missing required parameters in URL')).toBeInTheDocument();
    });
  });

  test('formats date correctly', async () => {
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEventData)
      })
    );

    render(<PlannerRSVP />);

    await waitFor(() => {
      expect(screen.getByText('12/25/2025')).toBeInTheDocument();
    });
  });
});