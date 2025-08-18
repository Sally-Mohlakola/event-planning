import React,{useState} from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { FcGoogle } from 'react-icons/fc';

import { HiOutlineMail } from 'react-icons/hi';
import { RiLockPasswordLine } from 'react-icons/ri';
import { FaRegHandPaper } from 'react-icons/fa';
import './Login.css'; 

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/home'); 
        } catch (error) {
            console.error("Error logging in:", error.message);
        }
    }
    const handleGoogleSignin = async () => {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
                navigate('/home');
            } catch (error) {
                console.error("Error signing in with Google:", error);
                let message = "Something went wrong";
                if(error.code == "auth/invalid-credential"){
                    message = "Invalid credential";
                }
        
          
                setError(message); 
            }
        }

        
       

  return (
    <main className="login-page">
      <section className="login-card">
        <header className="login-header">
          <h1 className="login-title">
            Welcome Back! <FaRegHandPaper className="wave-icon" />
          </h1>
          <p className="login-subtitle">Please enter your details</p>
        </header>

{/* Google Sign-in */}
    <button className="btn google-btn" type="button" onClick={handleGoogleSignin}>
        Log in with Google <FcGoogle />
    </button>

        {/* Divider under subtitle */}
          <div className="divider">
            <hr />
            <span>or</span>
            <hr />
          </div>
          {error && <p className="error">{error}</p>}

        <form className="login-form" onSubmit={onSubmit} noValidate>
          {/* Email */}
          <label htmlFor="email" className="input-label">Email</label>
          <div className="input-with-icon">
            <svg className="input-icon" viewBox="0 0 24 24">
              <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-11Zm2.3-.5 7.2 5.1c.3.21.7.21 1 0L19.7 6H4.3Zm15.2 2.2-6.5 4.6a2.5 2.5 0 0 1-2.9 0L3.6 8.2V17.5c0 .55.45 1 1 1h14.8c.55 0 1-.45 1-1V8.2Z" />
            </svg>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <label htmlFor="password" className="input-label">Password</label>
          <div className="input-with-icon">
            <svg className="input-icon" viewBox="0 0 24 24">
              <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Zm3 4a1.75 1.75 0 0 1 1 3.2V19a1 1 0 1 1-2 0v-1.8a1.75 1.75 0 0 1 1-3.2Z" />
            </svg>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="center-link">
            <a className="link subtle" href="#forgot">Forgot Password?</a>
          </div>

          <button type="submit" className="btn primary">Log in</button>
        </form>

        <p className="muted center">
          Don’t have an account? <a className="link" href="signup">Sign up here</a>
        </p>
      </section>
    </main>
  );
}
