import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";

// MOCKS
// --- Mock react-router-dom ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// --- Mock firebase/auth ---
vi.mock("firebase/auth", () => {
  const mockAuth = {
    currentUser: {
      uid: "test-vendor",
      getIdToken: vi.fn(() => Promise.resolve("mock-token")),
    },
    onAuthStateChanged: vi.fn((cb) => {
      cb({ uid: "test-vendor", getIdToken: () => Promise.resolve("mock-token") });
      return vi.fn();
    }),
  };
  return { getAuth: () => mockAuth };
});

// --- Mock local firebase ---
vi.mock("../../firebase", () => {
  const mockAuth = {
    currentUser: {
      uid: "test-vendor",
      getIdToken: vi.fn(() => Promise.resolve("mock-token")),
    },
    onAuthStateChanged: vi.fn((cb) => {
      cb({ uid: "test-vendor", getIdToken: () => Promise.resolve("mock-token") });
      return vi.fn();
    }),
  };
  return { auth: mockAuth };
});

// --- Mock the fetching and confirming done by apis ---
global.fetch = vi.fn();
global.confirm = vi.fn(() => true);
// END OF MOCK


import VendorProfile from "../pages/vendor/vendorProfile";

describe("VendorProfile", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    global.fetch.mockClear();
    global.confirm.mockClear();
  });

  it("rendering loading state", () => {
    render(
      <MemoryRouter>
        <VendorProfile />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading your profile and services/i)).toBeInTheDocument();
  });

  it("renders that no profile is found if api returns null vendor after mocking api", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(
      <MemoryRouter>
        <VendorProfile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No vendor profile found/i)).toBeInTheDocument();
    });
  });

  it("mocks vendor profile rendering using api", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            businessName: "Test Vendor",
            category: "Catering",
            description: "Quality catering services",
            address: "123 Street",
            phone: "0123456789",
            email: "test@vendor.com",
            bookings: 10,
            totalReviews: 5,
            avgRating: 4.5,
            profilePic: "https://example.com/profile.jpg",
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: "service1", serviceName: "Buffet", cost: 500, chargeByHour: 50, extraNotes: "Includes setup" },
          ]),
      });

    render(
      <MemoryRouter>
        <VendorProfile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Vendor Profile")).toBeInTheDocument();
      expect(screen.getByText("Test Vendor")).toBeInTheDocument();
      expect(screen.getByText("Buffet")).toBeInTheDocument();
      expect(screen.getByText("Cost: R500")).toBeInTheDocument();
      expect(screen.getByText("Per Hour: R50")).toBeInTheDocument();
      expect(screen.getByText("Includes setup")).toBeInTheDocument();
    });
  });

  it("mock fetching your vendor profile using api", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ businessName: "Test Vendor" }),
    });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<MemoryRouter><VendorProfile /></MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Edit Profile/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Edit Profile/i));
    expect(mockNavigate).toHaveBeenCalledWith("/vendor/vendor-edit-profile");
  });

  it("mock adding a new service using api", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ businessName: "Test Vendor" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ serviceId: "service1" }),
      });

    render(
      <MemoryRouter>
        <VendorProfile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Add Service/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Add Service/i));

    fireEvent.change(screen.getByLabelText(/Service Name/i), { target: { value: "Catering" } });
    fireEvent.change(screen.getByLabelText(/Base Cost/i), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText(/Extra Notes/i), { target: { value: "Premium service" } });

    fireEvent.click(screen.getByText(/^Save$/i));

    await waitFor(() => {
      expect(screen.getByText("Catering")).toBeInTheDocument();
      expect(screen.getByText("Cost: R1000")).toBeInTheDocument();
      expect(screen.getByText("Premium service")).toBeInTheDocument();
    });
  });

  it("mock editing an existing service api", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ businessName: "Test Vendor" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ id: "service1", serviceName: "Buffet", cost: 500, extraNotes: "Standard" }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ serviceId: "service1" }),
      });

    render(
      <MemoryRouter>
        <VendorProfile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Buffet")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Edit Buffet"));
    fireEvent.change(screen.getByLabelText(/Service Name/i), { target: { value: "Updated Buffet" } });
    fireEvent.change(screen.getByLabelText(/Base Cost/i), { target: { value: "600" } });
    fireEvent.click(screen.getByText(/Update/i));

    await waitFor(() => {
      expect(screen.getByText("Updated Buffet")).toBeInTheDocument();
      expect(screen.getByText("Cost: R600")).toBeInTheDocument();
    });
  });

  it("mock delete service api", async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ businessName: "Test Vendor" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: "service1", serviceName: "Buffet", cost: 500 }]),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    render(
      <MemoryRouter>
        <VendorProfile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Buffet")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Delete Buffet"));

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(screen.queryByText("Buffet")).not.toBeInTheDocument();
    });
  });
});
