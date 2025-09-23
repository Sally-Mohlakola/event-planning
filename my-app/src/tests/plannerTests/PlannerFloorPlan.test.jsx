import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import PlannerFloorPlan from '../../pages/planner/PlannerFloorPlan';

// Mock Firebase auth
vi.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn(() => Promise.resolve('fake-token'))
    }
  }
}));

// Mock fetch
global.fetch = vi.fn();

// Mock venues data
const mockVenues = [
  { id: 'venue1', name: 'Grand Hall' },
  { id: 'venue2', name: 'Beach Resort' },
  { id: 'venue3', name: 'Conference Center' }
];

describe('PlannerFloorPlan Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    fetch.mockReset();
    fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ venues: mockVenues })
      })
    );
    // Mock localStorage
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();
  });

  test('renders main components', () => {
    render(<PlannerFloorPlan eventId="123" setActivePage={vi.fn()} />);
    
    expect(screen.getByText('Floorplan Designer')).toBeInTheDocument();
    expect(screen.getByText('Choose venue')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Add items')).toBeInTheDocument();
  });

  test('loads venues', async () => {
    render(<PlannerFloorPlan eventId="123" setActivePage={vi.fn()} />);

    await waitFor(() => {
      mockVenues.forEach(venue => {
        expect(screen.getByText(venue.name)).toBeInTheDocument();
      });
    });
  });

  test('adds and selects items', async () => {
    render(<PlannerFloorPlan eventId="123" setActivePage={vi.fn()} />);

    const addTableButton = screen.getByText('Add Small Round Table');
    await user.click(addTableButton);

    const addedItem = screen.getByText('Table Small');
    expect(addedItem).toBeInTheDocument();
    expect(addedItem.parentElement).toHaveClass('selected');
  });

  test('handles item selection and removal', async () => {
    render(<PlannerFloorPlan eventId="123" setActivePage={vi.fn()} />);

    // Add an item
    await user.click(screen.getByText('Add Chair'));
    const chairItem = screen.getByText('Chair');
    expect(chairItem).toBeInTheDocument();

    // Select the item
    await user.click(chairItem);
    expect(chairItem.parentElement).toHaveClass('selected');

    // Remove the item
    const removeButton = screen.getByText('Remove');
    await user.click(removeButton);
    expect(screen.queryByText('Chair')).not.toBeInTheDocument();
  });

  test('handles item scaling', async () => {
    render(<PlannerFloorPlan eventId="123" setActivePage={vi.fn()} />);

    // Add and select an item
    await user.click(screen.getByText('Add Square Table'));
    const tableItem = screen.getByText('Table Square');
    await user.click(tableItem);

    // Get initial size
    const initialWidth = tableItem.parentElement.style.width;

    // Scale up
    await user.click(screen.getByText('Scale Up'));
    expect(tableItem.parentElement.style.width).not.toBe(initialWidth);
  });

  test('handles item rotation', async () => {
    render(<PlannerFloorPlan eventId="123" setActivePage={vi.fn()} />);

    // Add and select an item
    await user.click(screen.getByText('Add Rectangle Table'));
    const tableItem = screen.getByText('Table Large');
    await user.click(tableItem);

    // Rotate
    await user.click(screen.getByText('Rotate +15°'));
    expect(tableItem.parentElement.style.transform).toContain('rotate(15deg)');
  });

  test('saves and loads drafts', async () => {
    render(<PlannerFloorPlan eventId="123" setActivePage={vi.fn()} />);

    // Add an item
    await user.click(screen.getByText('Add Stage'));

    // Save draft
    await user.click(screen.getByText('Save Draft'));
    expect(localStorage.setItem).toHaveBeenCalled();

    // Load draft
    localStorage.getItem.mockReturnValue(JSON.stringify({
      template: 'blank',
      items: [{
        id: 'test-item',
        type: 'stage',
        x: 100,
        y: 100,
        w: 300,
        h: 80,
        shape: 'rect',
        color: '#6b7280'
      }]
    }));

    await user.click(screen.getByText('Load Draft'));
    expect(screen.getByText('Stage')).toBeInTheDocument();
  });

  test('exports to PNG', async () => {
    // Mock canvas and URL methods
    const mockCanvas = {
      getContext: vi.fn(() => ({
        fillStyle: '',
        fillRect: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        font: '',
        textAlign: '',
        textBaseline: '',
        fillText: vi.fn()
      })),
      toDataURL: vi.fn(() => 'data:image/png;base64,fake'),
      width: 0,
      height: 0
    };

    global.document.createElement = vi.fn((element) => {
      if (element === 'canvas') return mockCanvas;
      if (element === 'a') return { click: vi.fn(), remove: vi.fn() };
      return document.createElement(element);
    });

    render(<PlannerFloorPlan eventId="123" setActivePage={vi.fn()} />);

    await user.click(screen.getByText('Download PNG'));
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
  });

  test('handles venue selection and upload', async () => {
    render(<PlannerFloorPlan eventId="123" setActivePage={vi.fn()} />);

    // Select venue
    await waitFor(() => {
      const venueButton = screen.getByText('Grand Hall');
      user.click(venueButton);
    });

    // Try to upload
    await user.click(screen.getByText('Send to Selected Vendor'));
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/event/123/venue/venue1/floorplan'),
      expect.any(Object)
    );
  });

  test('handles template changes', async () => {
    render(<PlannerFloorPlan eventId="123" setActivePage={vi.fn()} />);

    const templateSelect = screen.getByRole('combobox');
    await user.selectOptions(templateSelect, 'banquet');

    const canvas = screen.getByClassName('floorplan-canvas');
    expect(canvas).toHaveStyle({ background: '#f8fafc' });
  });
});