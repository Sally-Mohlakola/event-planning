import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import VendorDashboard from "../pages/vendor/VendorDashboard";

describe("VendorDashboard", () => {
  let mockSetActivePage;

  beforeEach(() => {
    mockSetActivePage = vi.fn();
    render(<VendorDashboard setActivePage={mockSetActivePage} />);
  });

  test("renders dashboard summary cards", () => {
    expect(screen.getByText(/total bookings/i)).toBeInTheDocument();
    expect(screen.getByText(/revenue \(MTD\)/i)).toBeInTheDocument();
    expect(screen.getByText(/avg rating/i)).toBeInTheDocument();
    expect(screen.getByText(/active contracts/i)).toBeInTheDocument();
  });

  test("renders recent bookings", () => {
    expect(screen.getByText(/corporate lunch/i)).toBeInTheDocument();
    expect(screen.getByText(/wedding reception/i)).toBeInTheDocument();
    expect(screen.getByText(/birthday party/i)).toBeInTheDocument();
  });

  test("renders recent reviews", () => {
    expect(screen.getByText(/sarah m\./i)).toBeInTheDocument();
    expect(screen.getByText(/john d\./i)).toBeInTheDocument();
  });

  test("renders quick action buttons", () => {
    expect(screen.getByTestId("quick-action-update-profile")).toBeInTheDocument();
    expect(screen.getByTestId("quick-action-new-booking")).toBeInTheDocument();
    expect(screen.getByTestId("quick-action-review-contracts")).toBeInTheDocument();
    expect(screen.getByTestId("quick-action-manage-venues")).toBeInTheDocument();
  });

  test("calls setActivePage when quick action buttons are clicked", () => {
    fireEvent.click(screen.getByTestId("quick-action-update-profile"));
    expect(mockSetActivePage).toHaveBeenCalledWith("profile");

    fireEvent.click(screen.getByTestId("quick-action-new-booking"));
    expect(mockSetActivePage).toHaveBeenCalledWith("bookings");

    fireEvent.click(screen.getByTestId("quick-action-review-contracts"));
    expect(mockSetActivePage).toHaveBeenCalledWith("contracts");

    fireEvent.click(screen.getByTestId("quick-action-manage-venues"));
    expect(mockSetActivePage).toHaveBeenCalledWith("floorplan");
  });
});
//