import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PlannerViewEvent from '../../pages/planner/PlannerViewEvent';
import { getAuth } from 'firebase/auth';

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

// Sample test data
const mockEvent = {
  id: '123',
  name: 'Wedding Event',
  location: 'Cape Town',
  date: new Date('2025-12-25'),
  duration: 4,
  expectedGuestCount: 100,
  eventCategory: 'Wedding',
  budget: 50000,
  plannerId: 'planner123',
  tasks: {
    'Book Venue': false,
    'Send Invitations': true
  }
};

const mockGuests = [
  {
    id: '1',
    firstname: 'John',
    lastname: 'Doe',
    email: 'john@example.com',
    plusOne: 1,
    rsvpStatus: 'accepted'
  }
];

const mockServices = [
  {
    id: '1',
    serviceName: 'Catering',
    vendorName: 'Food Co',
    vendorId: 'vendor123',
    status: 'confirmed',
    finalPrice: 5000
  }
];

describe('PlannerViewEvent Component', () => {
  beforeEach(() => {
    fetch.mockReset();
    // Mock successful API responses
    fetch.mockImplementation((url) => {
      if (url.includes('/guests')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ guests: mockGuests })
        });
      }
      if (url.includes('/services')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ services: mockServices })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  test('renders event details correctly', async () => {
    render(<PlannerViewEvent event={mockEvent} />);

    expect(screen.getByText(mockEvent.name)).toBeInTheDocument();
    expect(screen.getByText(`Location: ${mockEvent.location}`)).toBeInTheDocument();
    expect(screen.getByText(`Duration: ${mockEvent.duration} hrs`)).toBeInTheDocument();
  });

  test('handles edit mode toggle', async () => {
    render(<PlannerViewEvent event={mockEvent} />);

    const editButton = screen.getByText('Edit Event');
    fireEvent.click(editButton);

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue(mockEvent.name);
    fireEvent.change(nameInput, { target: { value: 'Updated Event Name' } });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/planner/me/123'),
        expect.any(Object)
      );
    });
  });

  test('loads and displays guests', async () => {
    render(<PlannerViewEvent event={mockEvent} />);

    const guestsTab = screen.getByText('Guests & RSVP');
    fireEvent.click(guestsTab);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  test('handles guest addition popup', async () => {
    render(<PlannerViewEvent event={mockEvent} />);

    const guestsTab = screen.getByText('Guests & RSVP');
    fireEvent.click(guestsTab);

    const addGuestButton = screen.getByText('+ Add Guest');
    fireEvent.click(addGuestButton);

    expect(screen.getByText('Add Guest')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
  });

  test('displays services correctly', async () => {
    render(<PlannerViewEvent event={mockEvent} />);

    const servicesTab = screen.getByText('Services');
    fireEvent.click(servicesTab);

    await waitFor(() => {
      expect(screen.getByText('Catering')).toBeInTheDocument();
      expect(screen.getByText('Vendored By: Food Co')).toBeInTheDocument();
    });
  });

  test('handles task toggling', async () => {
    render(<PlannerViewEvent event={mockEvent} />);

    const tasksTab = screen.getByText('Tasks');
    fireEvent.click(tasksTab);

    const taskCheckbox = screen.getByRole('checkbox', { name: 'Book Venue' });
    fireEvent.click(taskCheckbox);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/planner/me/123'),
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });
  });

  test('handles API errors gracefully', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve({ ok: false }));
    render(<PlannerViewEvent event={mockEvent} />);

    const guestsTab = screen.getByText('Guests & RSVP');
    fireEvent.click(guestsTab);

    await waitFor(() => {
      expect(screen.getByText('No guests added yet.')).toBeInTheDocument();
    });
  });

  test('formats dates correctly', () => {
    render(<PlannerViewEvent event={mockEvent} />);
    
    const dateString = screen.getByText(/December 25, 2025/);
    expect(dateString).toBeInTheDocument();
  });

  test('sends reminder to guest', async () => {
    render(<PlannerViewEvent event={mockEvent} />);

    const guestsTab = screen.getByText('Guests & RSVP');
    fireEvent.click(guestsTab);

    await waitFor(() => {
      const reminderButton = screen.getByText('Send Reminder');
      fireEvent.click(reminderButton);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sendReminder'),
        expect.any(Object)
      );
    });
  });
});