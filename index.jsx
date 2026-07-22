import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import logo from "../All good christian school/assests/logo.png";
import background from "../All good christian school/assests/background.jpg";
import "./style.css";
import { supabase } from "./supabaseClient";
import AdminGrades from "./AdminGrades";
import StudentGrades from "./StudentGrades";

function SceneBackground() {
  // Photo background, loaded from assets/background.jpg.
  // Replace that file with your own photo (same filename) to change it.
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: "-20px",
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(6px)",
          transform: "scale(1.03)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,14,32,0.35) 0%, rgba(10,14,32,0.5) 100%)" }} />
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function LoginRegisterCard({ onLogin, onRegister }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [active, setActive] = useState(false); // false = login shown, true = register shown

  const [loginAccount, setLoginAccount] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPopupOpen(true), 60);
    return () => clearTimeout(t);
  }, []);

  async function handleLoginSubmit(e) {
    e.preventDefault();
    if (!loginAccount.trim() || !loginPassword.trim()) {
      setLoginError("Enter your account and password.");
      return;
    }
    setLoginError("");
    setLoginSubmitting(true);
    const result = await onLogin({ account: loginAccount, password: loginPassword });
    setLoginSubmitting(false);
    if (result?.error) setLoginError(result.error);
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError("Fill in your name, email, and password.");
      return;
    }
    setRegError("");
    setRegSubmitting(true);
    const result = await onRegister({ name: regName, email: regEmail, password: regPassword });
    setRegSubmitting(false);
    if (result?.error) setRegError(result.error);
  }

  return (
    <div className={`wrapper ${popupOpen ? "active-popup" : ""} ${active ? "active" : ""}`}>
      {active && (
        <button type="button" className="close" aria-label="Back to login" onClick={() => setActive(false)}>
          &times;
        </button>
      )}

      <div className="form-box login">
        <h2>Login</h2>
        <form onSubmit={handleLoginSubmit}>
          <div className="input-box">
            <input
              type="email"
              required
              value={loginAccount}
              onChange={(e) => setLoginAccount(e.target.value)}
            />
            <label>Email</label>
            <span className="icon"><UserIcon /></span>
          </div>
          <div className="input-box">
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <label>Password</label>
            <span className="icon"><LockIcon /></span>
          </div>

          {loginError && <p className="error-msg">{loginError}</p>}

          <button type="submit" className="submit-btn" disabled={loginSubmitting}>
            {loginSubmitting ? "Logging in…" : "Login"}
          </button>

          
        </form>
      </div>

      <div className="form-box register">
        <h2>Register</h2>
        <form onSubmit={handleRegisterSubmit}>
          <div className="input-box">
            <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} />
            <label>Full name</label>
            <span className="icon"><UserIcon /></span>
          </div>
          <div className="input-box">
            <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
            <label>Email</label>
            <span className="icon"><MailIcon /></span>
          </div>
          <div className="input-box">
            <input type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
            <label>Password</label>
            <span className="icon"><LockIcon /></span>
          </div>

          {regError && <p className="error-msg">{regError}</p>}

          <button type="submit" className="submit-btn" disabled={regSubmitting}>
            {regSubmitting ? "Creating account…" : "Register"}
          </button>

          
        </form>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        setProfile(data || null);
        setProfileError(error ? error.message : "");
        setProfileLoading(false);
      });
  }, [session]);

  async function handleLogin({ account, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email: account, password });
    if (error) return { error: error.message };
    return {};
  }

  async function handleRegister({ name, email, password }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };
    return { error: "Account created — check your email to confirm it, then log in." };
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        Loading…
      </div>
    );
  }

  if (session) {
    if (profileLoading) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
          Loading your account…
        </div>
      );
    }

    if (!profile) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", padding: 20 }}>
          <div style={{ maxWidth: 480, background: "#fff7e0", color: "#8a6a00", padding: 20, borderRadius: 12, fontSize: 14 }}>
            <p style={{ marginTop: 0 }}>
              No account profile found for <strong>{session.user.email}</strong>
              {profileError ? ` (${profileError})` : ""}.
            </p>
            <p>
              If this is your admin account, run this in the Supabase SQL Editor with your user
              UUID (Authentication → Users → copy your UID):
            </p>
            <pre style={{ background: "#fff", padding: 10, borderRadius: 8, overflowX: "auto", fontSize: 12 }}>
{`insert into profiles (id, role)\nvalues ('YOUR-USER-UUID', 'teacher');`}
            </pre>
            <p style={{ marginBottom: 0 }}>Then refresh this page.</p>
          </div>
        </div>
      );
    }

    if (profile.role === "teacher") {
      return (
        <div style={{ position: "relative", minHeight: "100vh", width: "100%", background: "#f4f4f4" }}>
          <AdminGrades session={session} onSignOut={() => setSession(null)} />
        </div>
      );
    }

    return (
      <div style={{ position: "relative", minHeight: "100vh", width: "100%", background: "#f4f4f4" }}>
        <StudentGrades session={session} studentId={profile.student_id} onSignOut={() => setSession(null)} />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%", overflow: "hidden" }}>
      <SceneBackground />
      <img
        src={logo}
        alt="All Good Christian School logo"
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          width: 100,
          height: 100,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid rgba(255,255,255,0.85)",
          zIndex: 2,
        }}
      />
      <LoginRegisterCard onLogin={handleLogin} onRegister={handleRegister} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);