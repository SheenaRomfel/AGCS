import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import logo from "./assests/logo.png";
import background from "./assests/background.jpg";

const NAVY = "#1B2A4A";
const RUST = "#C1622D";
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

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

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setUploading(true);
    setError("");

    const ext = file.name.split(".").pop();
    const path = `${session.user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new photo shows immediately instead of a stale cached one.
    const bustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: rpcError } = await supabase.rpc("update_own_avatar", { new_url: bustedUrl });
    if (rpcError) {
      setError(rpcError.message);
      setUploading(false);
      return;
    }

    setStudent((prev) => (prev ? { ...prev, avatar_url: bustedUrl } : prev));
    setUploading(false);
  }

  const subjects = groupBySubject(grades);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Background photo, full page */}
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

      {/* Floating logo badge */}
      <img
        src={logo}
        alt="School logo"
        style={{
          position: "absolute",
          top: 14,
          left: 20,
          width: 100,
          height: 100,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid rgba(255,255,255,0.9)",
          zIndex: 2,
        }}
      />

      {/* Content panel */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: CARD_BG,
          borderRadius: 24,
          boxShadow: "0 24px 48px rgba(6,10,26,0.25)",
          padding: "40px 60px",
          width: "100%",
          maxWidth: 900,
        }}
      >
        {error && (
          <div style={{ background: "#fdecea", color: "#a13a1f", padding: "8px 12px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading…</p>
        ) : !studentId ? (
          <div style={{ background: "#fff7e0", color: "#8a6a00", padding: "14px 16px", borderRadius: 10, fontSize: 14 }}>
            Your account isn't linked to a student record yet. Ask your teacher to add your email
            ({session?.user?.email}) to the gradebook, then log in again.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 34 }}>
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                title="Click to change your photo"
                style={{
                  position: "relative",
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: student?.avatar_url ? `url(${student.avatar_url})` : "#D9D9D9",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: `2px solid ${NAVY}`,
                  flexShrink: 0,
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(27,42,74,0.55)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: "center",
                    opacity: uploading ? 1 : 0,
                    transition: "opacity 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading) e.currentTarget.style.opacity = 1;
                  }}
                  onMouseLeave={(e) => {
                    if (!uploading) e.currentTarget.style.opacity = 0;
                  }}
                >
                  {uploading ? "Uploading…" : "Change photo"}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelected}
                style={{ display: "none" }}
              />
              <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 600, fontSize: 32, color: NAVY, margin: 0 }}>
                Hello, <span style={{ color: RUST }}>{student?.name || "—"}</span>
              </h1>
            </div>

            {subjects.length === 0 ? (
              <p style={{ color: "#8a7c5c", fontSize: 14 }}>No grades recorded yet.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                {subjects.map(({ subject, pct }) => (
                  <div
                    key={subject}
                    style={{
                      background: PILL_BG,
                      borderRadius: 16,
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "1px solid #ddd0a8",
                    }}
                  >
                    <span style={{ fontSize: 17, fontWeight: 700, color: NAVY }}>{subject}</span>
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "#E4E4E4",
                        border: `1.5px solid ${NAVY}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
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

            <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
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
                  cursor: "pointer",
                }}
              >
                Okay
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}