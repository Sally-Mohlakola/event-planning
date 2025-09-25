import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PlannerDashboard from '../../pages/planner/PlannerDashboard';
import { getAuth } from 'firebase/auth';

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn(() => Promise.resolve('fake-token'))
    }
  })),
  onAuthStateChanged: vi.fn(callback => {
    callback({ uid: 'test-user' });
    return vi.fn();
  })
}));

// Mock fetch
global.fetch = vi.fn();

// Sample event data
const mockEvents = [
  {
    id: '1',
    name: 'Wedding Event',
    date: new Date('2025-12-25').toISOString(),
    location: 'Cape Town',
    expectedGuestCount: 150,
    budget: 75000,
    description: 'Beautiful beach wedding',
    status: 'upcoming'
  },
  {
    id: '2',
    name: 'Corporate Conference',
    date: new Date('2025-10-15').toISOString(),
    location: 'Johannesburg',
    expectedGuestCount: 300,
    budget: 100000,
    description: 'Annual tech conference',
    status: 'in-progress'
  },
  {
    id: '3',
    name: 'Past Event',
    date: new Date('2023-01-01').toISOString(),
    location: 'Durban',
    expectedGuestCount: 200,
    budget: 50000,
    description: 'Past conference',
    status: 'completed'
  }
];

describe('PlannerDashboard Component', () => {
  beforeEach(() => {
    fetch.mockReset();
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents })
      })
    );
  });

  test('renders dashboard components', async () => {
    render(
      <BrowserRouter>
        <PlannerDashboard onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText('Planner Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('New Event')).toBeInTheDocument();
  });

  test('displays correct summary statistics', async () => {
    render(
      <BrowserRouter>
        <PlannerDashboard onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 upcoming events
      expect(screen.getByText('Avg Attendance')).toBeInTheDocument();
      expect(screen.getByText('217')).toBeInTheDocument(); // Average of all events
    });
  });

  test('filters and displays upcoming events correctly', async () => {
    render(
      <BrowserRouter>
        <PlannerDashboard onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Wedding Event')).toBeInTheDocument();
      expect(screen.getByText('Corporate Conference')).toBeInTheDocument();
      expect(screen.queryByText('Past Event')).not.toBeInTheDocument();
    });
  });

  test('handles event selection', async () => {
    const mockSelectEvent = vi.fn();
    render(
      <BrowserRouter>
        <PlannerDashboard onSelectEvent={mockSelectEvent} />
      </BrowserRouter>
    );

    await waitFor(() => {
      const selectButtons = screen.getAllByText('Select Event');
      fireEvent.click(selectButtons[0]);
      expect(mockSelectEvent).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Wedding Event'
      }));
    });
  });

  test('handles navigation', async () => {
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', () => ({
      ...vi.importActual('react-router-dom'),
      useNavigate: () => mockNavigate
    }));

    render(
      <BrowserRouter>
        <PlannerDashboard onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    const newEventButton = screen.getByText('New Event');
    fireEvent.click(newEventButton);
    expect(mockNavigate).toHaveBeenCalledWith('/planner/new-event');
  });

  test('handles API error', async () => {
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false
      })
    );

    render(
      <BrowserRouter>
        <PlannerDashboard onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('You have no upcoming events')).toBeInTheDocument();
    });
  });

  test('calculates correct statistics', async () => {
    render(
      <BrowserRouter>
        <PlannerDashboard onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Test average attendance calculation
      const avgAttendance = screen.getByText('217'); // (150 + 300 + 200) / 3
      expect(avgAttendance).toBeInTheDocument();

      // Test upcoming events count
      const upcomingEvents = screen.getByText('2'); // Wedding + Conference
      expect(upcomingEvents).toBeInTheDocument();
    });
  });

  test('formats dates correctly', async () => {
    render(
      <BrowserRouter>
        <PlannerDashboard onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Thu, Dec 25, 2025/)).toBeInTheDocument();
      expect(screen.getByText(/Wed, Oct 15, 2025/)).toBeInTheDocument();
    });
  });

  test('displays vendor information correctly', () => {
    render(
      <BrowserRouter>
        <PlannerDashboard onSelectEvent={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText('ABC Catering')).toBeInTheDocument();
    expect(screen.getByText('SoundWorks')).toBeInTheDocument();
    expect(screen.getByText('VenueCo')).toBeInTheDocument();
  });
});