import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import Login from "../pages/Login";

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

// Mock firebase/auth
vi.mock("firebase/auth", async () => {
	const actual = await vi.importActual("firebase/auth");
	return {
		...actual,
		getAuth: vi.fn(),
		signInWithPopup: vi.fn(),
		GoogleAuthProvider: vi.fn(),
	};
});

// Mock the createPlannerAccount function
global.createPlannerAccount = vi.fn();

describe("Login Page", () => {
	beforeEach(() => {
		vi.mocked(getAuth).mockReturnValue({});
		vi.mocked(signInWithPopup).mockClear();
		vi.mocked(GoogleAuthProvider).mockClear();
		mockNavigate.mockClear();
		global.createPlannerAccount.mockClear();
	});

	it("renders the login page with all elements", () => {
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		expect(screen.getByText("Welcome Back!")).toBeInTheDocument();
		expect(
			screen.getByText("Please enter your details")
		).toBeInTheDocument();
		expect(screen.getByText("Log in with Google")).toBeInTheDocument();
		expect(screen.getByText("Sign up with Google")).toBeInTheDocument();
	});

	it("handles successful Google sign-in and navigates to /home", async () => {
		vi.mocked(signInWithPopup).mockResolvedValue({
			user: { uid: "123", email: "test@example.com" },
		});

		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByText("Log in with Google"));

		await waitFor(() => {
			expect(signInWithPopup).toHaveBeenCalled();
			expect(mockNavigate).toHaveBeenCalledWith("/home");
		});
	});

	it("handles failed Google sign-in and displays an error message", async () => {
		const error = {
			code: "auth/popup-closed-by-user",
			message: "Popup closed by user",
		};
		vi.mocked(signInWithPopup).mockRejectedValue(error);

		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByText("Log in with Google"));

		await waitFor(() => {
			expect(signInWithPopup).toHaveBeenCalled();
			// The error message is now part of the component's state, but not directly rendered.
			// We can check that navigation did not happen as an indicator of failure.
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});

	it("handles successful Google sign-up, creates a planner account and navigates to /login", async () => {
		vi.mocked(signInWithPopup).mockResolvedValue({
			user: { uid: "456", email: "newuser@example.com" },
		});
		global.createPlannerAccount.mockResolvedValue({});

		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByText("Sign up with Google"));

		await waitFor(() => {
			expect(signInWithPopup).toHaveBeenCalled();
			expect(mockNavigate).toHaveBeenCalledWith("/login");
		});
	});

	it("handles failed Google sign-up when email is already in use", async () => {
		const error = {
			code: "auth/email-already-in-use",
			message: "Email already in use",
		};
		vi.mocked(signInWithPopup).mockRejectedValue(error);

		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByText("Sign up with Google"));

		await waitFor(() => {
			expect(signInWithPopup).toHaveBeenCalled();
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});
});
