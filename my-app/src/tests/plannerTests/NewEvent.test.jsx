// src/tests/plannerTests/NewEvent.test.jsx
/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, beforeEach, vi, expect } from "vitest";
import NewEvent from "../../pages/planner/NewEvent";

// Mock Firebase Auth
vi.mock("firebase/auth", () => ({
  getAuth: () => ({
    currentUser: {
      uid: "test-user-123",
      getIdToken: vi.fn(() => Promise.resolve("fake-token")),
    },
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper render wrapper
const renderNewEvent = (props = {}) => {
  const defaultProps = {
    setActivePage: vi.fn(),
    ...props
  };
  
  return render(
    <MemoryRouter>
      <NewEvent {...defaultProps} />
    </MemoryRouter>
  );
};

describe("NewEvent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("renders the new event form", () => {
    renderNewEvent();

    expect(screen.getByText("Create New Event")).toBeInTheDocument();
    expect(screen.getByText("Tell us about your event")).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date & Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Style/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Event/i })).toBeInTheDocument();
  });

  it("shows back button and navigates on click", () => {
    const mockSetActivePage = vi.fn();
    renderNewEvent({ setActivePage: mockSetActivePage });

    const backButton = screen.getByText("← Back to Dashboard");
    fireEvent.click(backButton);

    expect(mockSetActivePage).toHaveBeenCalledWith('dashboard');
  });

  it("navigates to dashboard when setActivePage is not provided", () => {
    renderNewEvent({ setActivePage: undefined });

    const backButton = screen.getByText("← Back to Dashboard");
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/planner-dashboard");
  });

  it("updates form inputs correctly", () => {
    renderNewEvent();

    const eventNameInput = screen.getByLabelText(/Event Name/i);
    fireEvent.change(eventNameInput, { target: { value: "Test Event" } });
    expect(eventNameInput.value).toBe("Test Event");

    const eventCategorySelect = screen.getByLabelText(/Event Category/i);
    fireEvent.change(eventCategorySelect, { target: { value: "Wedding" } });
    expect(eventCategorySelect.value).toBe("Wedding");

    const durationInput = screen.getByLabelText(/Duration/i);
    fireEvent.change(durationInput, { target: { value: "3" } });
    expect(durationInput.value).toBe("3");

    const locationInput = screen.getByLabelText(/Location/i);
    fireEvent.change(locationInput, { target: { value: "Test Location" } });
    expect(locationInput.value).toBe("Test Location");

    const styleSelect = screen.getByLabelText(/Event Style/i);
    fireEvent.change(styleSelect, { target: { value: "Elegant/Formal" } });
    expect(styleSelect.value).toBe("Elegant/Formal");
  });

  it("shows error when required fields are missing", async () => {
    renderNewEvent();

    const submitButton = screen.getByRole("button", { name: /Create Event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Please fill in all required fields")).toBeInTheDocument();
    });
  });

  it("successfully creates an event with valid data", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
      })
    );

    renderNewEvent();

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Event Name/i), { target: { value: "Test Event" } });
    fireEvent.change(screen.getByLabelText(/Event Category/i), { target: { value: "Wedding" } });
    
    // Set a future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateTimeString = futureDate.toISOString().slice(0, 16);
    
    fireEvent.change(screen.getByLabelText(/Date & Time/i), { target: { value: dateTimeString } });
    fireEvent.change(screen.getByLabelText(/Duration/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "Test Location" } });
    fireEvent.change(screen.getByLabelText(/Event Style/i), { target: { value: "Elegant/Formal" } });

    const submitButton = screen.getByRole("button", { name: /Create Event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://us-central1-planit-sdp.cloudfunctions.net/api/event/apply",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer fake-token",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: "Test Event",
            eventCategory: "Wedding",
            startTime: dateTimeString,
            duration: "3",
            location: "Test Location",
            style: "Elegant/Formal",
            plannerId: "test-user-123",
            date: dateTimeString,
            description: "",
            theme: "",
            budget: null,
            expectedGuestCount: null,
            notes: ""
          })
        }
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Event created successfully!")).toBeInTheDocument();
    });

    // Should navigate after success
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/planner-dashboard");
    }, { timeout: 2000 });
  });

  it("handles API error when creating event", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
      })
    );

    renderNewEvent();

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Event Name/i), { target: { value: "Test Event" } });
    fireEvent.change(screen.getByLabelText(/Event Category/i), { target: { value: "Wedding" } });
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateTimeString = futureDate.toISOString().slice(0, 16);
    
    fireEvent.change(screen.getByLabelText(/Date & Time/i), { target: { value: dateTimeString } });
    fireEvent.change(screen.getByLabelText(/Duration/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "Test Location" } });
    fireEvent.change(screen.getByLabelText(/Event Style/i), { target: { value: "Elegant/Formal" } });

    const submitButton = screen.getByRole("button", { name: /Create Event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to create event")).toBeInTheDocument();
    });
  });

  it("handles network errors", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.reject(new Error("Network error"))
    );

    renderNewEvent();

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Event Name/i), { target: { value: "Test Event" } });
    fireEvent.change(screen.getByLabelText(/Event Category/i), { target: { value: "Wedding" } });
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateTimeString = futureDate.toISOString().slice(0, 16);
    
    fireEvent.change(screen.getByLabelText(/Date & Time/i), { target: { value: dateTimeString } });
    fireEvent.change(screen.getByLabelText(/Duration/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "Test Location" } });
    fireEvent.change(screen.getByLabelText(/Event Style/i), { target: { value: "Elegant/Formal" } });

    const submitButton = screen.getByRole("button", { name: /Create Event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

 

  it("prevents past date selection", () => {
    renderNewEvent();

    const dateInput = screen.getByLabelText(/Date & Time/i);
    
    // Get the current minDateTime value
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const expectedMinDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    expect(dateInput).toHaveAttribute('min', expectedMinDateTime);
  });

  it("validates duration range", () => {
    renderNewEvent();

    const durationInput = screen.getByLabelText(/Duration/i);
    expect(durationInput).toHaveAttribute('min', '1');
    expect(durationInput).toHaveAttribute('max', '24');
  });

  it("displays all event categories in dropdown", () => {
    renderNewEvent();

    const categorySelect = screen.getByLabelText(/Event Category/i);
    const options = categorySelect.querySelectorAll('option');
    
    // Should have default option + all categories
    expect(options.length).toBe(17); // 1 default + 16 categories
    
    const expectedCategories = [
      "Wedding", "Birthday Party", "Corporate Event", "Conference",
      "Baby Shower", "Graduation", "Anniversary", "Fundraiser",
      "Product Launch", "Holiday Party", "Networking Event", "Workshop",
      "Concert", "Festival", "Sports Event", "Other"
    ];

    expectedCategories.forEach(category => {
      expect(screen.getByText(category)).toBeInTheDocument();
    });
  });

  it("displays all event styles in dropdown", () => {
    renderNewEvent();

    const styleSelect = screen.getByLabelText(/Event Style/i);
    const options = styleSelect.querySelectorAll('option');
    
    // Should have default option + all styles
    expect(options.length).toBe(17); // 1 default + 16 styles
    
    const expectedStyles = [
      "Elegant/Formal", "Casual/Relaxed", "Modern/Contemporary", "Vintage/Classic",
      "Rustic/Country", "Minimalist", "Bohemian/Boho", "Industrial",
      "Garden/Outdoor", "Beach/Tropical", "Urban/City", "Traditional",
      "Glamorous", "Fun/Playful", "Professional", "Themed"
    ];

    expectedStyles.forEach(style => {
      expect(screen.getByText(style)).toBeInTheDocument();
    });
  });

  it("shows location hint text", () => {
    renderNewEvent();

    expect(screen.getByText("Start typing to search for locations")).toBeInTheDocument();
  });

  it("clears error message when form is resubmitted successfully", async () => {
    // First attempt fails
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
      })
    ).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
      })
    );

    renderNewEvent();

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Event Name/i), { target: { value: "Test Event" } });
    fireEvent.change(screen.getByLabelText(/Event Category/i), { target: { value: "Wedding" } });
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateTimeString = futureDate.toISOString().slice(0, 16);
    
    fireEvent.change(screen.getByLabelText(/Date & Time/i), { target: { value: dateTimeString } });
    fireEvent.change(screen.getByLabelText(/Duration/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "Test Location" } });
    fireEvent.change(screen.getByLabelText(/Event Style/i), { target: { value: "Elegant/Formal" } });

    // First submit - fails
    const submitButton = screen.getByRole("button", { name: /Create Event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to create event")).toBeInTheDocument();
    });

    // Second submit - succeeds
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText("Failed to create event")).not.toBeInTheDocument();
      expect(screen.getByText("Event created successfully!")).toBeInTheDocument();
    });
  });

  

  it("maintains form state between renders", () => {
    const { rerender } = renderNewEvent();

    const eventNameInput = screen.getByLabelText(/Event Name/i);
    fireEvent.change(eventNameInput, { target: { value: "Test Event" } });

    // Re-render component
    rerender(
      <MemoryRouter>
        <NewEvent setActivePage={vi.fn()} />
      </MemoryRouter>
    );

    // Form state should be maintained
    expect(screen.getByLabelText(/Event Name/i).value).toBe("Test Event");
  });
});