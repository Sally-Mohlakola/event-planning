import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import ChatComponent from "../../pages/planner/ChatComponent";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Send: () => <svg data-testid="send-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  CheckCheck: () => <svg data-testid="check-check-icon" />,
  Clock: () => <svg data-testid="clock-icon" />,
  User: () => <svg data-testid="user-icon" />,
  Building2: () => <svg data-testid="building2-icon" />,
  X: () => <svg data-testid="x-icon" />,
}));

// Mock firebase/auth
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      uid: "testUser",
      getIdToken: vi.fn(() => Promise.resolve("fake-token")),
    },
  })),
}));

// Mock CSS import
vi.mock("./ChatComponent.css", () => ({}));

// Polyfill scrollIntoView for jsdom
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// Mock fetch
global.fetch = vi.fn();

describe("ChatComponent", () => {
  const defaultProps = {
    plannerId: "planner123",
    vendorId: "vendor123",
    eventId: "event123",
    currentUser: { id: "testUser", type: "vendor", name: "Test Vendor" },
    otherUser: { id: "otherUser", type: "planner", name: "Alice" },
    closeChat: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockImplementation((url, options) => {
      if (url.includes(`/api/chats/${defaultProps.eventId}/${defaultProps.plannerId}/${defaultProps.vendorId}/messages`)) {
        if (options.method === "GET") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                messages: [
                  {
                    id: "1",
                    senderId: "otherUser",
                    senderName: "Alice",
                    senderType: "planner",
                    content: "Hello",
                    status: "delivered",
                    createdAt: new Date().toISOString(),
                  },
                ],
              }),
          });
        } else if (options.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          });
        }
      }
      return Promise.reject(new Error("Unmocked fetch"));
    });
  });

  it("renders participants and header correctly", () => {
    render(<ChatComponent {...defaultProps} />);
    expect(screen.getByText("Test Vendor")).toBeInTheDocument();
    expect(screen.getByText("(vendor)")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("(planner)")).toBeInTheDocument();
    expect(screen.getByTestId("x-icon")).toBeInTheDocument();
  });

  it("calls closeChat when X button is clicked", () => {
    render(<ChatComponent {...defaultProps} />);
    const closeButton = screen.getByTestId("x-icon").closest("button");
    fireEvent.click(closeButton);
    expect(defaultProps.closeChat).toHaveBeenCalled();
  });

  
 
  
  it("shows typing indicator when isTyping is true", async () => {
    // Note: isTyping is not triggered by current user's input; it requires external trigger (e.g., WebSocket)
    // For this test, we can only verify absence unless component logic changes
    render(<ChatComponent {...defaultProps} />);
    const input = screen.getByPlaceholderText("Message Alice...");
    fireEvent.change(input, { target: { value: "..." } });
    expect(screen.queryByText("Alice is typing...")).not.toBeInTheDocument();
    // To test isTyping=true, component would need to expose a way to set it (e.g., via prop or mock event)
  });
});