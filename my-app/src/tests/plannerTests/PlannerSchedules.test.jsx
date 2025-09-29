// src/tests/plannerTests/PlannerSchedules.test.jsx
/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, beforeEach, vi, expect } from "vitest";
import PlannerSchedules from "../../pages/planner/PlannerSchedules";

// Mock Firebase Auth
vi.mock("firebase/auth", () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(() => Promise.resolve("fake-token")),
    },
  }),
}));

// Mock jsPDF and autoTable
vi.mock("jspdf", () => ({
  jsPDF: vi.fn(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
  })),
}));

vi.mock("jspdf-autotable", () => ({
  autoTable: vi.fn(),
}));

// Mock Lucide React icons - define inline to avoid hoisting issues
vi.mock("lucide-react", () => {
  const createMockIcon = (testId) => ({ className, ...props }) => 
    React.createElement('div', { 
      'data-testid': testId, 
      className, 
      ...props 
    }, testId);

  return {
    Calendar: createMockIcon("calendar-icon"),
    Clock: createMockIcon("clock-icon"),
    Upload: createMockIcon("upload-icon"),
    Plus: createMockIcon("plus-icon"),
    Download: createMockIcon("download-icon"),
    Edit3: createMockIcon("edit-icon"),
    Trash2: createMockIcon("trash-icon"),
    Save: createMockIcon("save-icon"),
    FileText: createMockIcon("file-text-icon"),
    Database: createMockIcon("database-icon"),
    List: createMockIcon("list-icon"),
    X: createMockIcon("x-icon"),
    ChevronDown: createMockIcon("chevron-down-icon"),
    ChevronUp: createMockIcon("chevron-up-icon"),
    AlertCircle: createMockIcon("alert-circle-icon"),
    CheckCircle: createMockIcon("check-circle-icon"),
    ExternalLink: createMockIcon("external-link-icon"),
  };
});

// Helper render wrapper
const renderWithRouter = (ui) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

// Test Data
const mockEvents = [
  {
    id: "1",
    name: "Tech Conference 2024",
    date: { _seconds: 1735689600, _nanoseconds: 0 },
    eventCategory: "Conference",
    expectedGuestCount: 200,
    duration: 8,
  },
  {
    id: "2",
    name: "Summer Wedding",
    date: { _seconds: 1743465600, _nanoseconds: 0 },
    eventCategory: "Wedding",
    expectedGuestCount: 150,
    duration: 6,
  },
];

const mockSchedules = [
  {
    id: "schedule-1",
    scheduleTitle: "Main Conference Schedule",
    items: [
      {
        id: "item-1",
        time: "09:00",
        title: "Opening Keynote",
        duration: "60",
        description: "Welcome and opening remarks"
      },
      {
        id: "item-2",
        time: "10:00",
        title: "Technical Workshop",
        duration: "120",
        description: "Hands-on technical session"
      }
    ]
  },
  {
    id: "schedule-2",
    scheduleTitle: "Evening Networking",
    items: []
  }
];

describe("PlannerSchedules", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  const setupMocksForEventSelection = (schedules = []) => {
    // Mock fetchEvents
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      })
    );

    // Mock fetchSchedules
    if (schedules.length > 0) {
      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ schedules }),
        })
      );
    } else {
      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ schedules: [] }),
        })
      );
    }
  };

  const setupMocksForScheduleCreation = () => {
    setupMocksForEventSelection([]);
    
    // Mock addSchedule
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: "new-schedule-123" }),
      })
    );
  };

  // Helper function to select an event
  const selectEvent = async (eventName = "Tech Conference 2024") => {
    const eventCards = screen.getAllByTestId("event-card");
    const eventCard = eventCards.find(card => 
      card.textContent?.includes(eventName)
    );
    if (eventCard) {
      fireEvent.click(eventCard);
    }
    return eventCard;
  };

  // Helper function to expand a schedule
  const expandSchedule = async (scheduleTitle = "Main Conference Schedule") => {
    const scheduleHeaders = screen.getAllByText(scheduleTitle);
    if (scheduleHeaders.length > 0) {
      // Find the parent schedule container and click the header
      const scheduleContainer = scheduleHeaders[0].closest('[data-testid="schedule-container"]');
      if (scheduleContainer) {
        const header = scheduleContainer.querySelector('.ps-schedule-header');
        if (header) {
          fireEvent.click(header);
          // Wait a bit for the expansion animation
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  };

  it("renders header and events list", async () => {
    setupMocksForEventSelection();
    renderWithRouter(<PlannerSchedules />);

    expect(await screen.findByRole("heading", { name: /Schedule Manager/i })).toBeInTheDocument();
    expect(screen.getByText(/Your Events/i)).toBeInTheDocument();
    
    expect(screen.getByText("Tech Conference 2024")).toBeInTheDocument();
    expect(screen.getByText("Summer Wedding")).toBeInTheDocument();
  });

  it("shows empty state when no event is selected", async () => {
    setupMocksForEventSelection();
    renderWithRouter(<PlannerSchedules />);

    await screen.findByText("Tech Conference 2024");
    
    expect(screen.getByText("Select an Event")).toBeInTheDocument();
    expect(screen.getByText("Choose an event from your list to start managing schedules")).toBeInTheDocument();
  });

  it("loads schedules when event is selected", async () => {
    setupMocksForEventSelection(mockSchedules);
    renderWithRouter(<PlannerSchedules />);

    await screen.findByText("Tech Conference 2024");
    
    await selectEvent();

    await waitFor(() => {
      expect(screen.getByText("Tech Conference 2024 Schedules")).toBeInTheDocument();
    });
    
    expect(screen.getByText("Main Conference Schedule")).toBeInTheDocument();
    expect(screen.getByText("Evening Networking")).toBeInTheDocument();
  });

  it("shows create schedule modal when clicking new schedule button", async () => {
    setupMocksForEventSelection([]);
    renderWithRouter(<PlannerSchedules />);

    await screen.findByText("Tech Conference 2024");
    
    await selectEvent();

    await waitFor(() => {
      expect(screen.getByText("No Schedules Created")).toBeInTheDocument();
    });

    // Click create schedule button
    const newScheduleButton = screen.getByRole("button", { name: /New Schedule/i });
    fireEvent.click(newScheduleButton);

    // Check if modal opened
    await waitFor(() => {
      expect(screen.getByText("Create New Schedule")).toBeInTheDocument();
    });
  });

  it("creates a new manual schedule", async () => {
    setupMocksForScheduleCreation();
    renderWithRouter(<PlannerSchedules />);

    await screen.findByText("Tech Conference 2024");
    
    await selectEvent();

    // Wait for empty state and click create button
    await waitFor(() => {
      expect(screen.getByText("No Schedules Created")).toBeInTheDocument();
    });

    const newScheduleButton = screen.getByRole("button", { name: /New Schedule/i });
    fireEvent.click(newScheduleButton);

    // Wait for modal and fill form
    await waitFor(() => {
      expect(screen.getByText("Create New Schedule")).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText(/Enter schedule name/i);
    fireEvent.change(titleInput, { target: { value: "Test Schedule" } });

    // Click manual creation option
    const manualOption = screen.getByText("Create Manually");
    fireEvent.click(manualOption);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText("Create New Schedule")).not.toBeInTheDocument();
    });
  });

  
  
 
  it("handles empty schedules state", async () => {
    setupMocksForEventSelection([]);
    renderWithRouter(<PlannerSchedules />);

    await screen.findByText("Tech Conference 2024");
    
    await selectEvent();

    await waitFor(() => {
      expect(screen.getByText("No Schedules Created")).toBeInTheDocument();
      expect(screen.getByText("Create your first schedule to start planning your event timeline")).toBeInTheDocument();
    });
  });

  it("shows notification on successful schedule creation", async () => {
    setupMocksForScheduleCreation();
    renderWithRouter(<PlannerSchedules />);

    await screen.findByText("Tech Conference 2024");
    
    await selectEvent();

    // Wait for empty state and click create button
    await waitFor(() => {
      expect(screen.getByText("No Schedules Created")).toBeInTheDocument();
    });

    const newScheduleButton = screen.getByRole("button", { name: /New Schedule/i });
    fireEvent.click(newScheduleButton);

    // Wait for modal and fill form
    await waitFor(() => {
      expect(screen.getByText("Create New Schedule")).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText(/Enter schedule name/i);
    fireEvent.change(titleInput, { target: { value: "Test Schedule" } });

    // Click manual creation option
    const manualOption = screen.getByText("Create Manually");
    fireEvent.click(manualOption);

    // Check for success notification
    await waitFor(() => {
      expect(screen.getByText("Schedule created successfully!")).toBeInTheDocument();
    });
  });


});