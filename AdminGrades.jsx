import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";
import logo from "./assets/logo.png";
import background from "./assets/background.jpg";



const NAVY = "#1B2A4A";
const RUST = "#C1622D";
const CARD_BG = "#FDFBF3";
const SUBJECTS = ["Math", "Filipino", "English", "Writing"];
const LETTER_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
const LETTER_TO_SCORE = {
  "A+": 99, A: 95, "A-": 91,
  "B+": 88, B: 85, "B-": 81,
  "C+": 78, C: 75, "C-": 71,
  "D+": 68, D: 65, "D-": 61,
  F: 50,
};

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

export default function AdminGrades({ session, onSignOut }) {
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");

  const [gStudentId, setGStudentId] = useState("");
  const [gSubject, setGSubject] = useState("");
  const [gGrade, setGGrade] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const [studentsRes, gradesRes] = await Promise.all([
      supabase.from("students").select("*").order("name"),
      supabase.from("grades").select("*").order("created_at"),
    ]);
    if (studentsRes.error) setError(studentsRes.error.message);
    if (gradesRes.error) setError(gradesRes.error.message);
    setStudents(studentsRes.data || []);
    setGrades(gradesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddStudent(e) {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim()) return;
    setError("");
    const { data, error: fnError } = await supabase.functions.invoke("create-student-account", {
      body: { name: newStudentName.trim(), email: newStudentEmail.trim().toLowerCase() },
    });
    if (fnError || data?.error) {
      setError(data?.error || fnError.message);
      return;
    }
    setNewStudentName("");
    setNewStudentEmail("");
    loadData(); // refresh the students list to include the new one
    alert(`Account created for ${newStudentName}.\nDefault password: ${data.defaultPassword}\nAsk them to change it after they first log in.`);
  }

  async function handleDeleteStudent(studentId) {
    const { error: deleteError } = await supabase.from("students").delete().eq("id", studentId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setGrades((prev) => prev.filter((g) => g.student_id !== studentId));
  }

  async function handleAddGrade(e) {
    e.preventDefault();
    if (!gStudentId || !gSubject.trim() || !gGrade) return;
    const { data, error: insertError } = await supabase
      .from("grades")
      .insert({
        student_id: gStudentId,
        subject: gSubject.trim(),
        assignment: `${gSubject.trim()} grade`,
        score: LETTER_TO_SCORE[gGrade],
        max_score: 100,
      })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setGrades((prev) => [...prev, data]);
    setGSubject("");
    setGGrade("");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    if (onSignOut) onSignOut();
  }

  const teacherName =
    session?.user?.user_metadata?.name || (session?.user?.email ? session.user.email.split("@")[0] : "");

  // Fixed subject columns (Math, Filipino, English, Writing) instead of
  // deriving them from whatever's been typed in so far.
  const subjects = SUBJECTS;

  function subjectPctFor(studentId, subject) {
    const relevant = grades.filter((g) => g.student_id === studentId && g.subject === subject);
    if (relevant.length === 0) return null;
    const earned = relevant.reduce((sum, g) => sum + g.score, 0);
    const possible = relevant.reduce((sum, g) => sum + g.max_score, 0);
    return possible ? (earned / possible) * 100 : null;
  }

  function handleExportExcel() {
    const rows = students.map((s) => {
      const row = { Student: s.name, Email: s.email };
      subjects.forEach((subj) => {
        row[subj] = letterGrade(subjectPctFor(s.id, subj));
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `grades-${today}.xlsx`);
  }

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
        <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 600, fontSize: 22, color: NAVY, margin: "0 0 22px" }}>
          Hello, Teacher, <span style={{ color: RUST }}>{teacherName} 💕 </span>
        </h1>

        {error && (
          <div style={{ background: "#fdecea", color: "#a13a1f", padding: "8px 12px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            {/* Students */}
            <section style={{ marginBottom: 30 }}>
              <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 600, fontSize: 16, color: NAVY, marginBottom: 12 }}>
                Students
              </h2>

              {students.map((s) => (
                <div
                  key={s.id}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 0", borderBottom: "1px solid #eee2c8" }}
                >
                  <span style={{ flex: "0 0 140px", fontWeight: 600, color: NAVY, fontSize: 14 }}>{s.name}</span>
                  <span style={{ flex: 1, color: "#555", fontSize: 13.5 }}>{s.email}</span>
                  <button
                    onClick={() => handleDeleteStudent(s.id)}
                    style={{ border: "none", background: "transparent", color: "#c1392b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <form onSubmit={handleAddStudent} style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
                <input
                  placeholder="Student Name"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  style={{ flex: "0 0 160px", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd0a8", background: "#f4ecd7" }}
                />
                <input
                  type="email"
                  placeholder="Student Gmail"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd0a8", background: "#f4ecd7" }}
                />
                <button
                  type="submit"
                  style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: NAVY, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  ADD
                </button>
              </form>
            </section>

            {/* Grades */}
            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 600, fontSize: 16, color: NAVY, margin: 0 }}>
                  Grades
                </h2>
                <button
                  onClick={handleExportExcel}
                  disabled={students.length === 0}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: `1px solid ${NAVY}`,
                    background: "transparent",
                    color: NAVY,
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: students.length === 0 ? "default" : "pointer",
                    opacity: students.length === 0 ? 0.5 : 1,
                  }}
                >
                  Export to Excel
                </button>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 20 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: `2px solid ${NAVY}` }}>
                    <th style={{ padding: "6px 8px 10px", color: NAVY }}>Student</th>
                    {subjects.map((subj) => (
                      <th key={subj} style={{ padding: "6px 8px 10px", color: NAVY, textAlign: "center" }}>
                        {subj}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={subjects.length + 1} style={{ padding: "10px 8px", color: "#8a7c5c" }}>
                        No students yet.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #eee2c8" }}>
                        <td style={{ padding: "8px", fontWeight: 600, color: NAVY }}>{s.name}</td>
                        {subjects.map((subj) => (
                          <td key={subj} style={{ padding: "8px", textAlign: "center" }}>
                            {letterGrade(subjectPctFor(s.id, subj))}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div style={{ background: "#f4ecd7", borderRadius: 12, padding: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Record a grade
                </p>
                <form onSubmit={handleAddGrade} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <select
                    value={gStudentId}
                    onChange={(e) => setGStudentId(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd0a8" }}
                  >
                    <option value="">Student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={gSubject}
                    onChange={(e) => setGSubject(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd0a8", width: 110 }}
                  >
                    <option value="">Subject…</option>
                    {SUBJECTS.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                  <select
                    value={gGrade}
                    onChange={(e) => setGGrade(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd0a8", width: 90 }}
                  >
                    <option value="">Grade…</option>
                    {LETTER_GRADES.map((letter) => (
                      <option key={letter} value={letter}>
                        {letter}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: NAVY, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    Add
                  </button>
                </form>
              </div>
            </section>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
              <button
                onClick={handleSignOut}
                style={{ padding: "10px 34px", borderRadius: 999, border: "none", background: NAVY, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
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