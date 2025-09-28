// src/tests/vendorTests/vendorBooking.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import VendorBooking from "../../pages/vendor/vendorBooking";

// --- Mock Firebase ---
vi.mock("../../firebase", () => ({
  auth: {
    currentUser: {
      uid: "testVendor",
      getIdToken: vi.fn(() => Promise.resolve("fake-token")), // ✅ ensure available
    },
    onAuthStateChanged: vi.fn(),
  },
  db: {},
  storage: {},
}));

// --- Global fetch mock ---
global.fetch = vi.fn();

describe("VendorBooking Component rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(<VendorBooking />);
    expect(
      screen.getByText(/Loading your bookings/i) // ✅ matches component text
    ).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    fetch.mockRejectedValueOnce(new Error("Failed to fetch"));

    render(<VendorBooking />);

    await waitFor(() =>
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument() // ✅ matches component output
    );
  });

  it("renders empty bookings message when no bookings exist", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bookings: [] }),
    });

    render(<VendorBooking />);

    await waitFor(() =>
      expect(screen.getByText(/No bookings found/i)).toBeInTheDocument()
    );
  });


});
