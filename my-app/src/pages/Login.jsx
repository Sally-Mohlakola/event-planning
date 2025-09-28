import React, { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { FcGoogle } from "react-icons/fc";

import { HiOutlineMail } from "react-icons/hi";
import { RiLockPasswordLine } from "react-icons/ri";
import { FaRegHandPaper } from "react-icons/fa";
import "./Login.css";

export default function Login() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [error, setError] = useState(null);
	const [resetMessage, setResetMessage] = useState(null);
	const [password, setPassword] = useState("");

	const handleGoogleSignin = async () => {
		const provider = new GoogleAuthProvider();
		try {
			await signInWithPopup(auth, provider);
			navigate("/home");
		} catch (error) {
			console.error("Error signing in with Google:", error);
			let message = "Something went wrong";
			if (error.code == "auth/invalid-credential") {
				message = "Invalid credential";
			}

			setError(message);
		}
	};
	const handleGoogleSignup = async () => {
		const provider = new GoogleAuthProvider();
		try {
			setError("");

			const userCrendential = await signInWithPopup(auth, provider);

			//To create planner document on signup
			const uid = userCrendential.user.uid;
			const email = userCrendential.user.email;

			console.log(email);
			await createPlannerAccount(email, uid);
			navigate("/login");
		} catch (error) {
			console.error("Error signing up with Google:", error);
			let message = "Something went wrong";
			if (error.code == "auth/email-already-in-use") {
				message =
					"Account with this email already exists, log in instead.";
			}
			setError(message);
		}
	};

	return (
		<section className="background">
			<main className="login-page">
				<section className="login-card">
					<header className="login-header">
						<h1 className="login-title">
							Welcome Back!{" "}
							<FaRegHandPaper className="wave-icon" />
						</h1>
						<p className="login-subtitle">
							Please enter your details
						</p>
					</header>

					{/* Google Sign-in */}
					<button
						className="btn google-btn"
						type="button"
						onClick={handleGoogleSignin}
					>
						Log in with Google <FcGoogle />
					</button>
					<div className="divider">
						<hr />
						<span>or</span>
						<hr />
					</div>
					{/* Google Sign-in */}
					<button
						className="btn google-btn"
						type="button"
						onClick={handleGoogleSignup}
					>
						Sign up with Google <FcGoogle />
					</button>
				</section>
			</main>
		</section>
	);
}
