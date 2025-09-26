import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PlannerAllEvents from '../../pages/planner/PlannerAllEvents';
import { getAuth } from 'firebase/auth';
import userEvent from '@testing-library/user-event';

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn(() => Promise.resolve('fake-token'))
    }
  }))
}));

// Mock fetch API
global.fetch = vi.fn();

const mockEvents = [
  {
    id: '1',
    name: 'Wedding Ceremony',
    status: 'upcoming',
    date: '2025-12-25',
    location: 'Cape Town',
    expectedGuestCount: 150,
    budget: 75000,
    description: 'Luxurious beach wedding'
  },
  {
    id: '2',
    name: 'Corporate Event',
    status: 'in-progress',
    date: '2025-10-15',
    location: 'Johannesburg',
    expectedGuestCount: 300,
    budget: 100000,
    description: 'Annual company conference'
  }
];

describe('PlannerAllEvents Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    fetch.mockReset();
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents })
      })
    );
  });

  test('initial render and API call', async () => {
    render(
      <BrowserRouter>
        <PlannerAllEvents setActivePage={vi.fn()} onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText('My Events')).toBeInTheDocument();
    expect(screen.getByText('+ New Event')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events',
        expect.any(Object)
      );
    });
  });

  test('search functionality', async () => {
    render(
      <BrowserRouter>
        <PlannerAllEvents setActivePage={vi.fn()} onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search events...');
    await user.type(searchInput, 'Wedding');

    await waitFor(() => {
      expect(screen.getByText('Wedding Ceremony')).toBeInTheDocument();
      expect(screen.queryByText('Corporate Event')).not.toBeInTheDocument();
    });
  });

  test('status filtering', async () => {
    render(
      <BrowserRouter>
        <PlannerAllEvents setActivePage={vi.fn()} onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    await waitFor(() => {
      const upcomingButton = screen.getByText('Upcoming');
      fireEvent.click(upcomingButton);
    });

    expect(screen.getByText('Wedding Ceremony')).toBeInTheDocument();
    expect(screen.queryByText('Corporate Event')).not.toBeInTheDocument();
  });

  test('sorting functionality', async () => {
    render(
      <BrowserRouter>
        <PlannerAllEvents setActivePage={vi.fn()} onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    const sortSelect = screen.getByRole('combobox');
    await user.selectOptions(sortSelect, 'budget');

    await waitFor(() => {
      const eventCards = screen.getAllByRole('heading', { level: 3 });
      expect(eventCards[0].textContent).toBe('Corporate Event');
    });
  });

  test('event selection', async () => {
    const mockSelectEvent = vi.fn();
    render(
      <BrowserRouter>
        <PlannerAllEvents setActivePage={vi.fn()} onSelectEvent={mockSelectEvent} />
      </BrowserRouter>
    );

    await waitFor(() => {
      const selectButtons = screen.getAllByText('Select Event');
      fireEvent.click(selectButtons[0]);
    });

    expect(mockSelectEvent).toHaveBeenCalledWith(mockEvents[0]);
  });

  test('API error handling', async () => {
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false
      })
    );

    render(
      <BrowserRouter>
        <PlannerAllEvents setActivePage={vi.fn()} onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No events found matching your criteria')).toBeInTheDocument();
    });
  });

  test('event card displays correct information', async () => {
    render(
      <BrowserRouter>
        <PlannerAllEvents setActivePage={vi.fn()} onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('R75,000')).toBeInTheDocument();
      expect(screen.getByText('150 attendees')).toBeInTheDocument();
      expect(screen.getByText('Cape Town')).toBeInTheDocument();
      expect(screen.getByText('Luxurious beach wedding')).toBeInTheDocument();
    });
  });

  test('navigation to new event page', async () => {
    const navigate = vi.fn();
    vi.mock('react-router-dom', () => ({
      ...vi.importActual('react-router-dom'),
      useNavigate: () => navigate
    }));

    render(
      <BrowserRouter>
        <PlannerAllEvents setActivePage={vi.fn()} onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    const newEventButton = screen.getByText('+ New Event');
    await user.click(newEventButton);

    expect(navigate).toHaveBeenCalledWith('/planner/new-event');
  });
});