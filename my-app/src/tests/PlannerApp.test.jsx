import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlannerApp from "../pages/planner/PlannerApp";

describe("PlannerApp", () => {
  beforeEach(() => {
    render(
      <MemoryRouter>
        <PlannerApp />
      </MemoryRouter>
    );
  });

  test("renders initial placeholder content", () => {
    // Match the actual placeholder text
    expect(
      screen.getByText(
        "This page is coming soon. All the functionality will be built here."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
  });

  test("navigates to Events tab", () => {
    fireEvent.click(screen.getByText("Events"));
    // Still placeholder, so check for the same text
    expect(
      screen.getByText(
        "This page is coming soon. All the functionality will be built here."
      )
    ).toBeInTheDocument();
  });

  test("back to dashboard button works", () => {
    fireEvent.click(screen.getByText("Events"));
    const backBtn = screen.getByText("Back to Dashboard");
    expect(backBtn).toBeInTheDocument();
  });
});
