import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {auth} from '../firebase';


import { FcGoogle } from 'react-icons/fc';

export default function Signup() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            navigate('/login');
        } catch (error) {
            const errorMessage = error.message;
            console.error("Error signing up:", error);
        }

    }
    const handleGoogleSignup = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            navigate('/login');
        } catch (error) {
            console.error("Error signing up with Google:", error);
        }
    }
    return (
        <section className="signup-container">
            <h1>Sign Up</h1>
            <form onSubmit={onSubmit}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Sign Up</button>
            </form>
            <button className="google-signup" onClick={handleGoogleSignup}>
                <FcGoogle /> Sign up with Google
            </button>
            <p>Already have an account? <a href="/login">Login</a></p>
        </section>
    );
}