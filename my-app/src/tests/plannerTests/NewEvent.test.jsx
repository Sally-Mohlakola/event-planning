// src/NewEvent.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import NewEvent from "../../pages/planner/NewEvent.jsx";

// Mock useNavigate from react-router-dom
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// Mock firebase/auth
vi.mock("firebase/auth", () => ({
  getAuth: () => ({
    currentUser: {
      uid: "user-123",
      getIdToken: vi.fn(() => Promise.resolve("mock-token")),
    },
  }),
}));

// Reset fetch mocks before each test
beforeEach(() => {
  global.fetch = vi.fn();
  vi.clearAllMocks();
});

describe("NewEvent Component", () => {
  test("renders form fields correctly", () => {
    render(<NewEvent setActivePage={vi.fn()} />);

    expect(screen.getByLabelText(/Event Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date & Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Style/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Event/i })).toBeInTheDocument();
  });

  test("shows error if required fields are empty", async () => {
    render(<NewEvent setActivePage={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Create Event/i }));

    expect(await screen.findByText(/Please fill in all required fields/i)).toBeInTheDocument();
  });

  test("submits form and calls API with correct payload", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(<NewEvent setActivePage={vi.fn()} />);

    // Fill in fields
    fireEvent.change(screen.getByLabelText(/Event Name/i), { target: { value: "My Wedding" } });
    fireEvent.change(screen.getByLabelText(/Event Category/i), { target: { value: "Wedding" } });
    fireEvent.change(screen.getByLabelText(/Date & Time/i), { target: { value: "2025-12-01T10:00" } });
    fireEvent.change(screen.getByLabelText(/Duration/i), { target: { value: 4 } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "Cape Town" } });
    fireEvent.change(screen.getByLabelText(/Event Style/i), { target: { value: "Elegant/Formal" } });

    fireEvent.click(screen.getByRole("button", { name: /Create Event/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    const call = fetch.mock.calls[0];
    expect(call[0]).toContain("/api/event/apply");
    expect(call[1].method).toBe("POST");
    expect(call[1].headers.Authorization).toBe("Bearer mock-token");

    const body = JSON.parse(call[1].body);
    expect(body.name).toBe("My Wedding");
    expect(body.eventCategory).toBe("Wedding");
    expect(body.location).toBe("Cape Town");

    // Success message appears
    expect(await screen.findByText(/Event created successfully/i)).toBeInTheDocument();
  });

  test("shows error if API call fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    render(<NewEvent setActivePage={vi.fn()} />);

    // Fill in fields
    fireEvent.change(screen.getByLabelText(/Event Name/i), { target: { value: "My Event" } });
    fireEvent.change(screen.getByLabelText(/Event Category/i), { target: { value: "Conference" } });
    fireEvent.change(screen.getByLabelText(/Date & Time/i), { target: { value: "2025-12-01T10:00" } });
    fireEvent.change(screen.getByLabelText(/Duration/i), { target: { value: 2 } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "Joburg" } });
    fireEvent.change(screen.getByLabelText(/Event Style/i), { target: { value: "Modern/Contemporary" } });

    fireEvent.click(screen.getByRole("button", { name: /Create Event/i }));

    expect(await screen.findByText(/Failed to create event/i)).toBeInTheDocument();
  });

  test("back button calls setActivePage if provided", () => {
    const mockSetActivePage = vi.fn();
    render(<NewEvent setActivePage={mockSetActivePage} />);

    fireEvent.click(screen.getByRole("button", { name: /Back to Dashboard/i }));

    expect(mockSetActivePage).toHaveBeenCalledWith("dashboard");
  });
});
