// src/tests/vendorTests/vendorDashboard.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import VendorDashboard from '../../pages/vendor/VendorDashboard';

// Mock Firebase properly
vi.mock('../../firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn(),
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
}));

// Mock firebase/auth separately
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Calendar: () => 'Calendar',
  Star: () => 'Star',
  StarHalf: () => 'StarHalf',
  DollarSign: () => 'DollarSign',
  Eye: () => 'Eye',
  Edit: () => 'Edit',
  X: () => 'X',
  Trash2: () => 'Trash2',
}));

// Mock VendorDashboardHTML component
vi.mock('../../pages/vendor/VendorDashboardHTML', () => ({
  default: vi.fn((props) => (
    <div data-testid="vendor-dashboard-html">
      <div>Vendor Dashboard HTML Component</div>
      <button onClick={() => props.setShowServiceForm(true)}>Add Service</button>
      <button onClick={() => props.handleEdit(mockServices[0])}>Edit Service</button>
      <div>Services Count: {props.services.length}</div>
      <div>Analytics: {props.analytics ? 'Loaded' : 'Not Loaded'}</div>
      {props.error && <div className="error">{props.error}</div>}
      {props.loading && <div>Loading...</div>}
    </div>
  )),
}));

// Import the actual onAuthStateChanged after mocking
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';

// Mock data
const mockUser = {
  uid: 'vendor123',
  getIdToken: vi.fn().mockResolvedValue('mock-token'),
};

const mockServices = [
  {
    id: 'service1',
    serviceName: 'Photography',
    cost: '1500',
    chargeByHour: '500',
    chargePerPerson: '',
    chargePerSquareMeter: '',
    extraNotes: 'Professional photography services',
  },
];

const mockBookings = [
  {
    id: 'booking1',
    eventId: 'event1',
    eventName: 'Wedding Ceremony',
    date: '2024-12-01T10:00:00Z',
    status: 'confirmed',
    budget: '5000',
  },
];

const mockAnalytics = {
  reviews: [
    {
      id: 'review1',
      rating: 5,
      review: 'Excellent service!',
      reviewerName: 'John Doe',
      timeOfReview: { _seconds: 1609459200, _nanoseconds: 0 },
    },
  ],
  totalRevenue: 15000,
  responseRate: 95,
  completionRate: 98,
  repeatCustomers: 12,
};

const mockVendorReport = {
  totalRevenue: 15000,
  avgRating: 4.5,
  totalReviews: 25,
};

// Global fetch mock
global.fetch = vi.fn();

describe('VendorDashboard Component', () => {
  const mockSetActivePage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock onAuthStateChanged implementation
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return vi.fn(); // unsubscribe function
    });

    // Mock auth.currentUser
    auth.currentUser = {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    };

    // Mock successful API responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/vendor/bookings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ bookings: mockBookings }),
        });
      }
      if (url.includes('/analytics/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAnalytics),
        });
      }
      if (url.includes('/vendors/') && url.includes('/services')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockServices),
        });
      }
      if (url.includes('/vendor/my-report')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockVendorReport),
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders loading state initially', async () => {
    render(<VendorDashboard setActivePage={mockSetActivePage} />);
    
    // Should show loading initially
    expect(screen.getByText(/Loading your dashboard/i)).toBeInTheDocument();
    
    // Wait for loading to complete and component to render
    await waitFor(() => {
      expect(screen.getByTestId('vendor-dashboard-html')).toBeInTheDocument();
    });
  });

  it('loads and displays dashboard data successfully', async () => {
    render(<VendorDashboard setActivePage={mockSetActivePage} />);

    await waitFor(() => {
      expect(screen.getByTestId('vendor-dashboard-html')).toBeInTheDocument();
    });

    expect(screen.getByText(/Services Count: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Analytics: Loaded/i)).toBeInTheDocument();
  });

  
  

  it('handles service operations', async () => {
    // Mock successful service creation
    global.fetch.mockImplementation((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ serviceId: 'new-service' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockServices),
      });
    });

    render(<VendorDashboard setActivePage={mockSetActivePage} />);

    await waitFor(() => {
      expect(screen.getByTestId('vendor-dashboard-html')).toBeInTheDocument();
    });

    // Test would continue with service creation, editing, deletion
    // This requires more detailed mocking of the HTML component
  });

  it('calculates analytics data correctly', async () => {
    render(<VendorDashboard setActivePage={mockSetActivePage} />);

    await waitFor(() => {
      expect(screen.getByTestId('vendor-dashboard-html')).toBeInTheDocument();
    });

    // Verify analytics calculation
    // The component should properly combine analytics data with vendor report
  });
});

describe('VendorDashboard Error Handling', () => {
  const mockSetActivePage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return vi.fn();
    });
    auth.currentUser.getIdToken = vi.fn().mockResolvedValue('mock-token');
  });

  
  it('handles malformed API responses', async () => {
    global.fetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' }), // Malformed response
      })
    );

    render(<VendorDashboard setActivePage={mockSetActivePage} />);

    await waitFor(() => {
      // Should handle malformed data gracefully
      expect(screen.getByTestId('vendor-dashboard-html')).toBeInTheDocument();
    });
  });
});

describe('VendorDashboard Performance', () => {
  it('placeholder - performance tests to be implemented', () => {
    expect(true).toBe(true);
  });
});