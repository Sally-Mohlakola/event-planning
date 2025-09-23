import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PlannerAllEvents from '../../pages/planner/PlannerAllEvents';
import { getAuth } from 'firebase/auth';

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn(() => Promise.resolve('fake-token'))
    }
  }))
}));

// Mock fetch
global.fetch = vi.fn();

// Sample event data
const mockEvents = [
  {
    id: 1,
    name: 'Wedding Event',
    status: 'upcoming',
    date: '2025-10-01',
    location: 'Cape Town',
    expectedGuestCount: 100,
    budget: 50000,
    description: 'A beautiful wedding'
  },
  {
    id: 2,
    name: 'Corporate Conference',
    status: 'in-progress',
    date: '2025-09-15',
    location: 'Johannesburg',
    expectedGuestCount: 200,
    budget: 75000,
    description: 'Annual corporate meeting'
  }
];

describe('PlannerAllEvents Component', () => {
  beforeEach(() => {
    fetch.mockReset();
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents })
      })
    );
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PlannerAllEvents 
          setActivePage={vi.fn()} 
          onSelectEvent={vi.fn()}
        />
      </BrowserRouter>
    );
  };

  test('renders main components', async () => {
    renderComponent();
    
    expect(screen.getByText('My Events')).toBeInTheDocument();
    expect(screen.getByText('+ New Event')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search events...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Wedding Event')).toBeInTheDocument();
    });
  });

  test('fetches and displays events', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Wedding Event')).toBeInTheDocument();
      expect(screen.getByText('Corporate Conference')).toBeInTheDocument();
    });
  });

  test('filters events by search term', async () => {
    renderComponent();

    const searchInput = screen.getByPlaceholderText('Search events...');
    fireEvent.change(searchInput, { target: { value: 'Wedding' } });

    await waitFor(() => {
      expect(screen.getByText('Wedding Event')).toBeInTheDocument();
      expect(screen.queryByText('Corporate Conference')).not.toBeInTheDocument();
    });
  });

  test('filters events by status', async () => {
    renderComponent();

    await waitFor(() => {
      const upcomingButton = screen.getByText('Upcoming');
      fireEvent.click(upcomingButton);
      
      expect(screen.getByText('Wedding Event')).toBeInTheDocument();
      expect(screen.queryByText('Corporate Conference')).not.toBeInTheDocument();
    });
  });

  test('sorts events by different criteria', async () => {
    renderComponent();

    const sortSelect = screen.getByRole('combobox');
    
    await waitFor(() => {
      fireEvent.change(sortSelect, { target: { value: 'budget' } });
      const events = screen.getAllByRole('heading', { level: 3 });
      expect(events[0].textContent).toBe('Corporate Conference');
    });
  });

  test('handles API error gracefully', async () => {
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false
      })
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No events found matching your criteria')).toBeInTheDocument();
    });
  });

  test('event card displays correct information', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('R50,000')).toBeInTheDocument();
      expect(screen.getByText('100 attendees')).toBeInTheDocument();
      expect(screen.getByText('Cape Town')).toBeInTheDocument();
    });
  });

  test('calls onSelectEvent when selecting an event', async () => {
    const mockSelectEvent = vi.fn();
    render(
      <BrowserRouter>
        <PlannerAllEvents 
          setActivePage={vi.fn()} 
          onSelectEvent={mockSelectEvent}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      const selectButtons = screen.getAllByText('Select Event');
      fireEvent.click(selectButtons[0]);
      expect(mockSelectEvent).toHaveBeenCalledWith(mockEvents[0]);
    });
  });
});