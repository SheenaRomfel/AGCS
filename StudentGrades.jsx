import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import logo from "../All good christian school/assests/logo.png";
import background from "../All good christian school/assests/background.jpg";


const NAVY = "#1B2A4A";
const CARD_BG = "#FDFBF3";
const PILL_BG = "#F4EAD5";
const SUBJECTS = ["Math", "Filipino", "English", "Writing"];

function letterGrade(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "—";
  if (pct >= 97) return "A+";
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 67) return "D+";
  if (pct >= 63) return "D";
  if (pct >= 60) return "D-";
  return "F";
}

function groupBySubject(grades) {
  const bySubject = new Map();
  SUBJECTS.forEach((subj) => bySubject.set(subj, { earned: 0, possible: 0 }));
  grades.forEach((g) => {
    if (!bySubject.has(g.subject)) bySubject.set(g.subject, { earned: 0, possible: 0 });
    const entry = bySubject.get(g.subject);
    entry.earned += g.score;
    entry.possible += g.max_score;
  });
  return Array.from(bySubject.entries()).map(([subject, { earned, possible }]) => ({
    subject,
    pct: possible ? (earned / possible) * 100 : null,
  }));
}

export default function StudentGrades({ session, studentId, onSignOut }) {
  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");

      if (!studentId) {
        setLoading(false);
        return;
      }

      const [studentRes, gradesRes] = await Promise.all([
        supabase.from("students").select("*").eq("id", studentId).single(),
        supabase.from("grades").select("*").eq("student_id", studentId).order("created_at"),
      ]);
      if (cancelled) return;
      if (studentRes.error) setError(studentRes.error.message);
      if (gradesRes.error) setError(gradesRes.error.message);
      setStudent(studentRes.data || null);
      setGrades(gradesRes.data || []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    if (onSignOut) onSignOut();
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: "#fdecea", color: "#a13a1f", padding: "12px 16px", borderRadius: 10, fontSize: 14 }}>{error}</div>
      </div>
    );
  }

  if (!studentId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", padding: 20 }}>
        <div style={{ maxWidth: 420, background: "#fff7e0", color: "#8a6a00", padding: 20, borderRadius: 12, fontSize: 14, textAlign: "center" }}>
          Your account isn't linked to a student record yet. Ask your teacher to add your email
          ({session?.user?.email}) to the gradebook, then log in again.
        </div>
      </div>
    );
  }

  const subjects = groupBySubject(grades);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          width: 380,
          maxWidth: "100%",
          background: CARD_BG,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(6,10,26,0.25)",
        }}
      >
        {/* Banner */}
        <div style={{ position: "relative", height: 120 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${background})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 35%)",
            }}
          />
          <img
            src={logo}
            alt="School logo"
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              width: 40,
              height: 40,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid rgba(255,255,255,0.9)",
            }}
          />
        </div>

        {/* Body */}
        <div style={{ padding: "0 26px 26px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: -34, marginBottom: 22 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#D9D9D9",
                border: `3px solid ${CARD_BG}`,
                flexShrink: 0,
              }}
            />
            <h1
              style={{
                fontFamily: "Fraunces, Georgia, serif",
                fontWeight: 600,
                fontSize: 19,
                color: NAVY,
                margin: 0,
                marginTop: 18,
              }}
            >
              {student?.name || "—"}
            </h1>
          </div>

          {subjects.length === 0 ? (
            <p style={{ color: "#8a7c5c", fontSize: 14, textAlign: "center" }}>No grades recorded yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {subjects.map(({ subject, pct }) => (
                <div
                  key={subject}
                  style={{
                    background: PILL_BG,
                    borderRadius: 14,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: NAVY }}>{subject}</span>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: NAVY,
                      flexShrink: 0,
                    }}
                  >
                    {letterGrade(pct)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={handleSignOut}
              style={{
                padding: "10px 34px",
                borderRadius: 999,
                border: "none",
                background: NAVY,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                cursor: "pointer",
              }}
            >
              Okay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}