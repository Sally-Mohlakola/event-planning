// src/tests/vendorTests/vendorFloorplan.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";

// --- MOCK FIREBASE --- //
vi.mock("../../firebase", () => {
  const mockGetDoc = vi.fn();
  const mockDoc = vi.fn();
  const mockAuth = {
    currentUser: { uid: "vendor-123", getIdToken: vi.fn(() => Promise.resolve("mock-token")) },
    onAuthStateChanged: vi.fn((cb) => {
      cb({ uid: "vendor-123", getIdToken: () => Promise.resolve("mock-token") });
      return vi.fn();
    }),
  };
  return { auth: mockAuth, db: {}, doc: mockDoc, getDoc: mockGetDoc };
});

// Re-import after mock
import { getDoc } from "../../firebase";
import VendorFloorplan from "../../pages/vendor/vendorFloorplan";

global.fetch = vi.fn();

describe("VendorFloorplan Component", () => {
  beforeEach(() => {
    global.fetch.mockClear();
    getDoc.mockClear();
  });

  it("renders loading initially", () => {
    render(
      <MemoryRouter>
        <VendorFloorplan />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading Floorplans/i)).toBeInTheDocument();
  });

  it("renders error when fetch fails", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <MemoryRouter>
        <VendorFloorplan />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch events/i)).toBeInTheDocument();
    });
  });
});
