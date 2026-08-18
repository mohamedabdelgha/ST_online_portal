import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { listGroups } from "../services/groupService";
import {
  listStudents,
  createStudent,
  updateStudent,
} from "../services/studentService";
import { supabase } from "../lib/supabase";

import Modal from "../components/Modal";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

// =========================================================
// FEEDBACK ITEM
// =========================================================

function FeedbackItem({ label, value }) {
  const percentage = Number(value || 0);

  return (
    <div
      style={{
        background: "#f9fafb",
        borderRadius: "6px",
        padding: "10px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#6b7280",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <strong>{percentage}%</strong>

      <div
        style={{
          height: "5px",
          background: "#e5e7eb",
          borderRadius: "10px",
          marginTop: "7px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: "#2563eb",
            borderRadius: "10px",
          }}
        />
      </div>
    </div>
  );
}

// =========================================================
// STUDENTS PAGE
// =========================================================

const blank = {
  full_name: "",
  phone: "",
  parent_phone: "",
  group_id: "",
  status: "active",
  join_date: "",
};

export default function Students() {
  const { profile } = useAuth();

  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);

  const [groupId, setGroupId] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // STUDENT EDIT MODAL
  // =========================================================

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  // =========================================================
  // STUDENT DETAILS MODAL
  // =========================================================

  const [selectedStudent, setSelectedStudent] = useState(null);

  // =========================================================
  // NOTES
  // =========================================================

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // =========================================================
  // LECTURE FEEDBACK
  // =========================================================

  const [feedback, setFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // =========================================================
  // LOAD STUDENTS
  // =========================================================

  async function load() {
    try {
      setLoading(true);
      setError("");

      const gs = await listGroups();

      setGroups(gs);

      const studentData = await listStudents(
        gs.map((g) => g.id)
      );

      setStudents(studentData);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [profile?.id]);

  // =========================================================
  // STUDENT EDIT
  // =========================================================

  function startEdit(s) {
    setEditing(s);

    setForm({
      full_name: s.full_name,
      phone: s.phone || "",
      parent_phone: s.parent_phone || "",
      group_id: s.group_id ? String(s.group_id) : "",
      status: s.status,
      join_date: s.join_date || "",
    });

    setOpen(true);
  }

  // =========================================================
  // SUBMIT STUDENT
  // =========================================================

  async function submit(e) {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        group_id: form.group_id
          ? Number(form.group_id)
          : null,
        join_date: form.join_date || undefined,
      };

      /*
       * Instructor cannot create students.
       * Only edit is allowed for existing students.
       */

      if (!editing && profile?.role !== "admin") {
        setError("Only administrators can add students.");
        return;
      }

      if (editing) {
        await updateStudent(editing.id, payload);
      } else {
        await createStudent(payload);
      }

      setOpen(false);

      await load();
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }

  // =========================================================
  // OPEN STUDENT
  // =========================================================

  async function openStudent(s) {
    setSelectedStudent(s);
    setNewNote("");

    await Promise.all([
      loadNotes(s.id),
      loadFeedback(s.id),
    ]);
  }

  // =========================================================
  // CLOSE STUDENT
  // =========================================================

  function closeStudent() {
    setSelectedStudent(null);
    setNotes([]);
    setFeedback([]);
    setNewNote("");
  }

  // =========================================================
  // LOAD NOTES
  // =========================================================

  async function loadNotes(studentId) {
    try {
      setNotesLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from("student_notes")
        .select(`
          id,
          student_id,
          author_id,
          author_name,
          note,
          created_at
        `)
        .eq("student_id", studentId)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setNotes(data || []);
    } catch (e) {
      console.error(e);
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }

  // =========================================================
  // ADD NOTE
  // =========================================================

  async function addNote() {
    const note = newNote.trim();

    if (!note || !selectedStudent) {
      return;
    }

    try {
      setSavingNote(true);

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const {
        data: author,
        error: authorError,
      } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (authorError) {
        throw authorError;
      }

      const {
        error,
      } = await supabase
        .from("student_notes")
        .insert({
          student_id: selectedStudent.id,
          author_id: user.id,
          author_name:
            author?.full_name || "Unknown",
          note,
        });

      if (error) {
        throw error;
      }

      setNewNote("");

      await loadNotes(selectedStudent.id);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setSavingNote(false);
    }
  }

  // =========================================================
  // DELETE NOTE
  // =========================================================

  async function deleteNote(noteId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from("student_notes")
        .delete()
        .eq("id", noteId);

      if (error) {
        throw error;
      }

      await loadNotes(selectedStudent.id);
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  }

  // =========================================================
  // LOAD LECTURE FEEDBACK
  // =========================================================

 async function loadFeedback(studentId) {
  try {
    setFeedbackLoading(true);

    console.log("Loading feedback for student:", studentId);

    const {
      data,
      error,
    } = await supabase
      .from("lecture_feedback")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", {
        ascending: false,
      });

    console.log("Feedback data:", data);
    console.log("Feedback error:", error);

    if (error) {
      throw error;
    }

    setFeedback(data || []);
  } catch (e) {
    console.error(
      "Error loading lecture feedback:",
      e
    );

    setFeedback([]);
  } finally {
    setFeedbackLoading(false);
  }
}

  // =========================================================
  // CALCULATE FEEDBACK AVERAGE
  // =========================================================

  function getFeedbackAverage(item) {
    const understanding =
      Number(item.understanding || 0);

    const involvement =
      Number(item.involvement || 0);

    const technical =
      Number(item.technical || 0);

    const activity =
      Number(item.activity || 0);

    return (
      (
        (understanding +
          involvement +
          technical +
          activity) /
        4
      ).toFixed(1)
    );
  }

  // =========================================================
  // PRINT STUDENT SHEET
  // =========================================================

  function printStudentSheet() {
    if (!selectedStudent) {
      return;
    }

    const student = selectedStudent;

    // -------------------------------------------------------
    // FEEDBACK HTML
    // -------------------------------------------------------

    const feedbackRows = feedback
      .map((item) => {
        const lectureTitle =
          item.lectures?.title ||
          `Lecture #${item.lecture_id}`;

        const lectureDate =
          item.lectures?.date || "";

        const average =
          getFeedbackAverage(item);

        return `
          <tr>

            <td>
              <strong>${lectureTitle}</strong>

              ${
                lectureDate
                  ? `
                    <br />
                    <small>
                      ${lectureDate}
                    </small>
                  `
                  : ""
              }
            </td>

            <td>
              ${item.understanding ?? 0}%
            </td>

            <td>
              ${item.involvement ?? 0}%
            </td>

            <td>
              ${item.technical ?? 0}%
            </td>

            <td>
              ${item.activity ?? 0}%
            </td>

            <td>
              <strong>
                ${average}%
              </strong>
            </td>

          </tr>
        `;
      })
      .join("");

    // -------------------------------------------------------
    // OPEN PRINT WINDOW
    // -------------------------------------------------------

    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

    if (!printWindow) {
      alert(
        "Please allow popups to print the student sheet."
      );

      return;
    }

    // -------------------------------------------------------
    // PRINT DOCUMENT
    // -------------------------------------------------------

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            ${student.full_name}
            - Student Sheet
          </title>

          <style>

            * {
              box-sizing: border-box;
            }

            body {
              font-family:
                Arial,
                sans-serif;

              margin: 40px;

              color: #111827;

              background: #ffffff;
            }

            h1 {
              margin: 0;

              font-size: 28px;
            }

            h2 {
              margin-top: 35px;

              margin-bottom: 15px;

              border-bottom:
                2px solid #e5e7eb;

              padding-bottom: 8px;

              font-size: 20px;
            }

            .subtitle {
              color: #6b7280;

              margin-top: 5px;

              margin-bottom: 30px;
            }

            .student-info {
              display: grid;

              grid-template-columns:
                1fr 1fr;

              gap: 12px;

              margin-bottom: 30px;
            }

            .info {
              border:
                1px solid #e5e7eb;

              border-radius: 6px;

              padding: 12px;
            }

            .info strong {
              display: block;

              font-size: 12px;

              color: #6b7280;

              margin-bottom: 5px;
            }

            table {
              width: 100%;

              border-collapse:
                collapse;

              margin-top: 10px;
            }

            th,
            td {
              border:
                1px solid #d1d5db;

              padding: 10px;

              text-align: left;

              font-size: 13px;
            }

            th {
              background:
                #f3f4f6;

              font-weight: 600;
            }

            td {
              vertical-align: top;
            }

            small {
              color: #6b7280;

              font-size: 10px;
            }

            .note {
              border:
                1px solid #e5e7eb;

              border-radius: 6px;

              padding: 12px;

              margin-bottom: 10px;
            }

            .note-header {
              display: flex;

              justify-content:
                space-between;

              gap: 10px;

              margin-bottom: 8px;
            }

            .note-header span {
              color: #6b7280;

              font-size: 11px;
            }

            .note p {
              margin: 0;

              line-height: 1.6;

              white-space: pre-wrap;
            }

            .empty {
              color: #6b7280;

              padding: 15px 0;
            }

            .footer {
              margin-top: 40px;

              padding-top: 15px;

              border-top:
                1px solid #e5e7eb;

              color: #6b7280;

              font-size: 11px;
            }

            @media print {

              body {
                margin: 20px;
              }

              h2 {
                break-after:
                  avoid;
              }

              table {
                break-inside:
                  auto;
              }

              tr {
                break-inside:
                  avoid;
              }

              .note {
                break-inside:
                  avoid;
              }

            }

          </style>

        </head>

        <body>

          <h1>
            ${student.full_name}
          </h1>

          <div class="subtitle">
            Student Performance Sheet
          </div>


          <!-- STUDENT INFORMATION -->

          <div class="student-info">

            <div class="info">

              <strong>
                Group
              </strong>

              ${student.groups?.name || "—"}

            </div>


            <div class="info">

              <strong>
                Status
              </strong>

              ${student.status || "—"}

            </div>


            <div class="info">

              <strong>
                Student Phone
              </strong>

              ${student.phone || "—"}

            </div>


            <div class="info">

              <strong>
                Parent Phone
              </strong>

              ${student.parent_phone || "—"}

            </div>


            <div class="info">

              <strong>
                Join Date
              </strong>

              ${student.join_date || "—"}

            </div>

          </div>


          <!-- LECTURE FEEDBACK -->

          <h2>
            Lecture Feedback
          </h2>

          ${
            feedback.length
              ? `
                <table>

                  <thead>

                    <tr>

                      <th>
                        Lecture
                      </th>

                      <th>
                        Understanding
                      </th>

                      <th>
                        Involvement
                      </th>

                      <th>
                        Technical
                      </th>

                      <th>
                        Activity
                      </th>

                      <th>
                        Average
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    ${feedbackRows}

                  </tbody>

                </table>
              `
              : `
                <div class="empty">
                  No lecture feedback
                  available.
                </div>
              `
          }


          <div class="footer">

            Generated on
            ${new Date().toLocaleString()}

          </div>

        </body>

      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  // =========================================================
  // FILTER
  // =========================================================

  const visible = students.filter((s) => {
    const matchesGroup =
      groupId === "all" ||
      String(s.group_id) === groupId;

    const matchesSearch =
      s.full_name
        ?.toLowerCase()
        .includes(
          search.toLowerCase().trim()
        );

    return (
      matchesGroup &&
      matchesSearch
    );
  });

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return <Loading />;
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error && !open) {
    return (
      <ErrorState
        message={error}
        onRetry={load}
      />
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div>

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="page-heading">

        <div>

          <h1>
            Students
          </h1>

          <p>
            {profile?.role === "admin"
              ? "View and edit every student."
              : "View students in your groups."}
          </p>

        </div>


        {/* ADMIN ONLY */}

        {profile?.role === "admin" && (

          <button
            className="btn"
            onClick={() => {

              setEditing(null);

              setForm({
                ...blank,

                group_id:
                  groups[0]?.id
                    ? String(
                        groups[0].id
                      )
                    : "",
              });

              setOpen(true);
            }}
          >
            + New student
          </button>

        )}

      </div>


      {/* =====================================================
          FILTER
      ===================================================== */}

      <div className="toolbar students-toolbar">

        <input
          className="student-search"
          type="text"
          placeholder="Search by student name..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />


        <select
          value={groupId}
          onChange={(e) =>
            setGroupId(
              e.target.value
            )
          }
        >

          <option value="all">
            All groups
          </option>


          {groups.map((g) => (

            <option
              value={g.id}
              key={g.id}
            >
              {g.name}
            </option>

          ))}

        </select>

      </div>


      {/* =====================================================
          STUDENTS TABLE
      ===================================================== */}

      <div className="panel">

        <div className="table-wrap">

          <table>

            <thead>

              <tr>

                <th>
                  Student
                </th>

                <th>
                  Group
                </th>

                <th>
                  Phone
                </th>

                <th>
                  Parent phone
                </th>

                <th>
                  Status
                </th>

                <th>
                  Join date
                </th>

                {profile?.role === "admin" && (
                  <th></th>
                )}

              </tr>

            </thead>


            <tbody>

              {visible.map((s) => (

                <tr key={s.id}>

                  {/* STUDENT */}

                  <td>

                    <button
                      className="text-btn"
                      onClick={() =>
                        openStudent(s)
                      }
                      style={{
                        fontWeight: 600,
                        color: "#2563eb",
                      }}
                    >
                      {s.full_name}
                    </button>

                  </td>


                  {/* GROUP */}

                  <td>
                    {s.groups?.name || "—"}
                  </td>


                  {/* PHONE */}

                  <td>
                    {s.phone || "—"}
                  </td>


                  {/* PARENT PHONE */}

                  <td>
                    {s.parent_phone || "—"}
                  </td>


                  {/* STATUS */}

                  <td>

                    <span
                      className={`badge ${s.status}`}
                    >
                      {s.status}
                    </span>

                  </td>


                  {/* JOIN DATE */}

                  <td>
                    {s.join_date || "—"}
                  </td>


                  {/* EDIT */}

                  <td>

                    {profile?.role === "admin" && (

                      <button
                        className="text-btn"
                        onClick={() =>
                          startEdit(s)
                        }
                      >
                        Edit
                      </button>

                    )}

                  </td>

                </tr>

              ))}


              {/* EMPTY */}

              {visible.length === 0 && (

                <tr>

                  <td
                    colSpan={
                      profile?.role === "admin"
                        ? 7
                        : 6
                    }
                    style={{
                      textAlign:
                        "center",
                      padding:
                        "30px",
                      color:
                        "#6b7280",
                    }}
                  >
                    No students found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* =====================================================
          EDIT STUDENT MODAL
      ===================================================== */}

      {open && (

        <Modal
          title={
            editing
              ? "Edit student"
              : "Add student"
          }
          onClose={() =>
            setOpen(false)
          }
        >

          <form
            onSubmit={submit}
            className="form-grid"
          >

            {/* FULL NAME */}

            <label>

              Full name

              <input
                value={
                  form.full_name
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    full_name:
                      e.target.value,
                  })
                }
                required
              />

            </label>


            {/* STUDENT PHONE */}

            <label>

              Student phone

              <input
                value={
                  form.phone
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone:
                      e.target.value,
                  })
                }
              />

            </label>


            {/* PARENT PHONE */}

            <label>

              Parent phone

              <input
                value={
                  form.parent_phone
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    parent_phone:
                      e.target.value,
                  })
                }
              />

            </label>


            {/* GROUP */}

            <label>

              Group

              <select
                value={
                  form.group_id
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    group_id:
                      e.target.value,
                  })
                }
                required
              >

                <option value="">
                  Select group
                </option>


                {groups.map((g) => (

                  <option
                    key={g.id}
                    value={g.id}
                  >
                    {g.name}
                  </option>

                ))}

              </select>

            </label>


            {/* STATUS */}

            <label>

              Status

              <select
                value={
                  form.status
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    status:
                      e.target.value,
                  })
                }
              >

                <option value="active">
                  Active
                </option>

                <option value="paused">
                  Paused
                </option>

                <option value="inactive">
                  Inactive
                </option>

              </select>

            </label>


            {/* JOIN DATE */}

            <label>

              Join date

              <input
                type="date"
                value={
                  form.join_date
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    join_date:
                      e.target.value,
                  })
                }
              />

            </label>


            {/* ACTIONS */}

            <div className="form-actions">

              <button
                className="btn secondary"
                type="button"
                onClick={() =>
                  setOpen(false)
                }
              >
                Cancel
              </button>


              <button
                className="btn"
                type="submit"
              >
                {editing
                  ? "Save changes"
                  : "Add"}
              </button>

            </div>

          </form>

        </Modal>

      )}


      {/* =====================================================
          STUDENT DETAILS MODAL
      ===================================================== */}

      {selectedStudent && (

        <Modal
          title={
            selectedStudent.full_name
          }
          onClose={closeStudent}
        >

          {/* =================================================
              PRINT BUTTON
          ================================================= */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              margin:
                "0 20px 10px",
            }}
          >

            <button
              className="btn secondary"
              type="button"
              onClick={
                printStudentSheet
              }
            >
              🖨 Print student sheet
            </button>

          </div>


          {/* =================================================
              STUDENT INFORMATION
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, 1fr)",
              gap: "12px",
              margin: "24px",
            }}
          >

            {/* GROUP */}

            <div className="info-box">

              <strong>
                Group
              </strong>

              <span>
                {
                  selectedStudent
                    .groups?.name ||
                  "—"
                }
              </span>

            </div>


            {/* STATUS */}

            <div className="info-box">

              <strong>
                Status
              </strong>

              <span>

                <span
                  className={`badge ${selectedStudent.status}`}
                >
                  {
                    selectedStudent
                      .status
                  }
                </span>

              </span>

            </div>


            {/* PHONE */}

            <div className="info-box">

              <strong>
                Student phone
              </strong>

              <span>
                {
                  selectedStudent.phone ||
                  "—"
                }
              </span>

            </div>


            {/* PARENT PHONE */}

            <div className="info-box">

              <strong>
                Parent phone
              </strong>

              <span>
                {
                  selectedStudent
                    .parent_phone ||
                  "—"
                }
              </span>

            </div>


            {/* JOIN DATE */}

            <div className="info-box">

              <strong>
                Join date
              </strong>

              <span>
                {
                  selectedStudent
                    .join_date ||
                  "—"
                }
              </span>

            </div>

          </div>


          {/* =================================================
              LECTURE FEEDBACK
          ================================================= */}

          <div
            style={{
              margin:
                "25px 20px",
            }}
          >

            {/* FEEDBACK HEADER */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "12px",
              }}
            >

              <div>

                <h3>
                  Lecture Feedback
                </h3>

                <p
                  style={{
                    color:
                      "#6b7280",
                    fontSize:
                      "13px",
                    marginTop:
                      "4px",
                  }}
                >
                  Student performance
                  in each lecture.
                </p>

              </div>


              <span className="badge">

                {feedback.length}{" "}

                {feedback.length === 1
                  ? "lecture"
                  : "lectures"}

              </span>

            </div>


            {/* FEEDBACK LOADING */}

            {feedbackLoading ? (

              <Loading />

            ) : feedback.length === 0 ? (

              <div
                style={{
                  padding:
                    "25px",
                  textAlign:
                    "center",
                  background:
                    "#f9fafb",
                  borderRadius:
                    "8px",
                  color:
                    "#6b7280",
                }}
              >
                No lecture feedback
                has been recorded
                for this student yet.
              </div>

            ) : (

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: "12px",
                }}
              >

                {feedback.map(
                  (item) => {

                    const average =
                      getFeedbackAverage(
                        item
                      );

                    return (

                      <div
                        key={
                          item.id
                        }
                        style={{
                          border:
                            "1px solid #e5e7eb",
                          borderRadius:
                            "8px",
                          padding:
                            "14px",
                          background:
                            "#fff",
                        }}
                      >

                        {/* LECTURE HEADER */}

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "flex-start",
                            marginBottom:
                              "15px",
                          }}
                        >

                          <div>

                            <strong>

                              {
                                item
                                  .lectures
                                  ?.title ||
                                `Lecture #${item.lecture_id}`

                              }

                            </strong>


                            {item
                              .lectures
                              ?.date && (

                              <div
                                style={{
                                  marginTop:
                                    "4px",
                                  fontSize:
                                    "11px",
                                  color:
                                    "#9ca3af",
                                }}
                              >

                                {
                                  item
                                    .lectures
                                    .date
                                }

                              </div>

                            )}

                          </div>


                          <span className="badge">

                            Average:{" "}
                            {average}%

                          </span>

                        </div>


                        {/* FEEDBACK VALUES */}

                        <div
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(4, 1fr)",
                            gap:
                              "8px",
                          }}
                        >

                          <FeedbackItem
                            label="Understanding"
                            value={
                              item.understanding
                            }
                          />

                          <FeedbackItem
                            label="Involvement"
                            value={
                              item.involvement
                            }
                          />

                          <FeedbackItem
                            label="Technical"
                            value={
                              item.technical
                            }
                          />

                          <FeedbackItem
                            label="Activity"
                            value={
                              item.activity
                            }
                          />

                        </div>

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </div>


          {/* =================================================
              NOTES TITLE
          ================================================= */}

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              margin:
                "12px",
            }}
          >

            <div>

              <h3>
                Notes
              </h3>

              <p
                style={{
                  color:
                    "#6b7280",
                  fontSize:
                    "13px",
                  marginTop:
                    "4px",
                }}
              >
                Notes written by
                instructors and
                administrators.
              </p>

            </div>


            <span className="badge">

              {notes.length}{" "}

              {notes.length === 1
                ? "note"
                : "notes"}

            </span>

          </div>


          {/* =================================================
              ADD NOTE
          ================================================= */}

          <div
            style={{
              margin:
                "20px",
            }}
          >

            <textarea
              value={
                newNote
              }
              onChange={(e) =>
                setNewNote(
                  e.target.value
                )
              }
              placeholder="Write a note about this student..."
              rows={2}
              style={{
                width:
                  "100%",
                resize:
                  "vertical",
                padding:
                  "12px",
                border:
                  "1px solid #d1d5db",
                borderRadius:
                  "8px",
                fontFamily:
                  "inherit",
                outline:
                  "none",
              }}
            />


            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                marginTop:
                  "10px",
              }}
            >

              <button
                className="btn"
                type="button"
                disabled={
                  savingNote ||
                  !newNote.trim()
                }
                onClick={
                  addNote
                }
              >

                {savingNote
                  ? "Saving..."
                  : "Add note"}

              </button>

            </div>

          </div>


          {/* =================================================
              NOTES LIST
          ================================================= */}

          {notesLoading ? (

            <Loading />

          ) : notes.length === 0 ? (

            <div
              style={{
                padding:
                  "30px",
                textAlign:
                  "center",
                background:
                  "#f9fafb",
                borderRadius:
                  "8px",
                color:
                  "#6b7280",
              }}
            >
              No notes have been
              added for this
              student yet.
            </div>

          ) : (

            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                margin:
                  "20px",
                gap:
                  "12px",
              }}
            >

              {notes.map(
                (note) => (

                  <div
                    key={
                      note.id
                    }
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      borderRadius:
                        "8px",
                      padding:
                        "10px",
                      background:
                        "#fff",
                    }}
                  >

                    {/* NOTE HEADER */}

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap:
                          "10px",
                      }}
                    >

                      <div>

                        <strong>
                          {
                            note
                              .author_name ||
                            "Unknown"
                          }
                        </strong>


                        <div
                          style={{
                            marginTop:
                              "4px",
                            fontSize:
                              "11px",
                            color:
                              "#9ca3af",
                          }}
                        >

                          {new Date(
                            note.created_at
                          ).toLocaleString()}

                        </div>

                      </div>


                      <button
                        className="text-btn danger"
                        type="button"
                        onClick={() =>
                          deleteNote(
                            note.id
                          )
                        }
                      >
                        Delete
                      </button>

                    </div>


                    {/* NOTE TEXT */}

                    <p
                      style={{
                        marginTop:
                          "12px",
                        color:
                          "#374151",
                        lineHeight:
                          1.6,
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {
                        note.note
                      }
                    </p>

                  </div>

                )
              )}

            </div>

          )}

        </Modal>

      )}

    </div>
  );
}