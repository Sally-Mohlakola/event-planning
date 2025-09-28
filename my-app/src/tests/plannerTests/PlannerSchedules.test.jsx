import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PlannerSchedules from '../../pages/planner/PlannerSchedules';
import userEvent from '@testing-library/user-event';

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

// Mock event data
const mockEvents = [
  {
    id: '1',
    name: 'Wedding Event',
    date: new Date('2025-12-25'),
    eventCategory: 'Wedding',
    expectedGuestCount: 150
  },
  {
    id: '2',
    name: 'Corporate Conference',
    date: new Date('2025-10-15'),
    eventCategory: 'Corporate',
    expectedGuestCount: 300
  }
];

// Mock schedule data
const mockSchedules = {
  1: [
    {
      id: 'schedule1',
      scheduleTitle: 'Main Timeline',
      items: [
        {
          id: 'item1',
          time: '09:00',
          title: 'Ceremony Start',
          duration: '60',
          description: 'Wedding ceremony begins'
        }
      ]
    }
  ]
};

describe('PlannerSchedules Component', () => {
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
      if (url.includes('/schedules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ schedules: mockSchedules[1] })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  test('renders main components', async () => {
    render(<PlannerSchedules />);
    
    expect(screen.getByText('Schedule Manager')).toBeInTheDocument();
    expect(screen.getByText('Your Events')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Wedding Event')).toBeInTheDocument();
      expect(screen.getByText('Corporate Conference')).toBeInTheDocument();
    });
  });

  test('selects event and displays schedules', async () => {
    render(<PlannerSchedules />);

    await waitFor(() => {
      const eventCard = screen.getByText('Wedding Event');
      fireEvent.click(eventCard);
    });

    await waitFor(() => {
      expect(screen.getByText('Main Timeline')).toBeInTheDocument();
    });
  });

  test('creates new schedule', async () => {
    render(<PlannerSchedules />);

    // Select event first
    await waitFor(() => {
      fireEvent.click(screen.getByText('Wedding Event'));
    });

    // Click new schedule button
    const newScheduleButton = screen.getByText('New Schedule');
    fireEvent.click(newScheduleButton);

    // Fill in schedule details
    const titleInput = screen.getByPlaceholderText('Enter schedule name (e.g., Main Event Timeline)');
    await user.type(titleInput, 'Reception Timeline');

    // Create manually
    const createManuallyButton = screen.getByText('Create Manually');
    await user.click(createManuallyButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/schedules'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Reception Timeline')
        })
      );
    });
  });

  test('adds schedule item', async () => {
    render(<PlannerSchedules />);

    // Select event and open schedule
    await waitFor(() => {
      fireEvent.click(screen.getByText('Wedding Event'));
    });

    await waitFor(() => {
      const addItemButton = screen.getByText('Add Item');
      fireEvent.click(addItemButton);
    });

    // Fill in item details
    const timeInput = screen.getByLabelText('Time');
    const titleInput = screen.getByPlaceholderText('Event title');
    const durationInput = screen.getByLabelText('Duration (minutes)');
    const descriptionInput = screen.getByPlaceholderText('Event description');

    await user.type(timeInput, '10:00');
    await user.type(titleInput, 'Reception Start');
    await user.type(durationInput, '120');
    await user.type(descriptionInput, 'Wedding reception begins');

    // Save item
    const saveButton = screen.getByText('Save Item');
    await user.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/items'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  test('exports schedule as PDF', async () => {
    render(<PlannerSchedules />);

    // Select event and open schedule
    await waitFor(() => {
      fireEvent.click(screen.getByText('Wedding Event'));
    });

    // Click export button
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    // Select PDF export
    const pdfExportButton = screen.getByText('PDF Document');
    fireEvent.click(pdfExportButton);

    // Verify PDF generation
    expect(screen.getByText('PDF file downloaded successfully!')).toBeInTheDocument();
  });

  test('deletes schedule item', async () => {
    render(<PlannerSchedules />);

    // Select event and open schedule
    await waitFor(() => {
      fireEvent.click(screen.getByText('Wedding Event'));
    });

    // Find and click delete button for item
    const deleteButton = screen.getAllByLabelText('Delete item')[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/items'),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  test('handles API errors gracefully', async () => {
    // Mock API error
    fetch.mockImplementationOnce(() => Promise.resolve({ ok: false }));

    render(<PlannerSchedules />);

    await waitFor(() => {
      expect(screen.getByText(/No events found/i)).toBeInTheDocument();
    });
  });

  test('uploads PDF schedule', async () => {
    render(<PlannerSchedules />);

    // Select event
    await waitFor(() => {
      fireEvent.click(screen.getByText('Wedding Event'));
    });

    // Open new schedule modal
    fireEvent.click(screen.getByText('New Schedule'));

    // Create file input and trigger upload
    const file = new File(['dummy content'], 'schedule.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText('Upload PDF');
    
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload-url'),
        expect.any(Object)
      );
    });
  });
});