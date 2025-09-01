// src/tests/PlannerApp.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import PlannerApp from "../pages/planner/PlannerApp";
import { MemoryRouter } from "react-router-dom";

// --- Mock all child components used in PlannerApp ---
vi.mock("../pages/planner/PlannerDashboard", () => ({
  default: ({ setActivePage }) => (
    <div>
      PlannerDashboard
      <button onClick={() => setActivePage("events")}>Go to Events</button>
    </div>
  ),
}));

vi.mock("../pages/planner/PlannerAllEvents", () => ({
  default: ({ setActivePage }) => (
    <div>
      PlannerAllEvents
      <button onClick={() => setActivePage("selected-event")}>
        Select Event
      </button>
    </div>
  ),
}));

vi.mock("../pages/planner/PlannerVendorMarketplace", () => ({
  default: () => <div>PlannerVendorMarketplace</div>,
}));

vi.mock("../pages/planner/PlannerViewEvent", () => ({
  default: () => <div>PlannerViewEvent</div>,
}));

// --- Test Suite ---
describe("PlannerApp", () => {
  it("renders dashboard by default", () => {
    render(
      <MemoryRouter>
        <PlannerApp />
      </MemoryRouter>
    );

    expect(screen.getByText("PlannerDashboard")).toBeInTheDocument();
  });

  it("navigates to a placeholder page when clicking a placeholder tab", () => {
    render(
      <MemoryRouter>
        <PlannerApp />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Floorplan")); // placeholder
    expect(
      screen.getByText("This page is coming soon. All the functionality will be built here.")
    ).toBeInTheDocument();
  });

  it("navigates back to dashboard from placeholder", () => {
    render(
      <MemoryRouter>
        <PlannerApp />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Floorplan"));
    fireEvent.click(screen.getByText("Back to Dashboard"));

    expect(screen.getByText("PlannerDashboard")).toBeInTheDocument();
  });

  it("navigates to Vendor Marketplace tab", () => {
    render(
      <MemoryRouter>
        <PlannerApp />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Vendor Marketplace"));
    expect(screen.getByText("PlannerVendorMarketplace")).toBeInTheDocument();
  });

  it("navigates to Events tab and selects an event", () => {
    render(
      <MemoryRouter>
        <PlannerApp />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Events"));
    expect(screen.getByText("PlannerAllEvents")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Select Event"));
    expect(screen.getByText("PlannerViewEvent")).toBeInTheDocument();
  });
});
//