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

  // Student edit modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  // Student details / notes modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

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
      setError(e.message);
    }
  }

  // =========================================================
  // STUDENT DETAILS
  // =========================================================

  async function openStudent(s) {
    setSelectedStudent(s);
    setNewNote("");

    await loadNotes(s.id);
  }

  function closeStudent() {
    setSelectedStudent(null);
    setNotes([]);
    setNewNote("");
  }

  // =========================================================
  // NOTES
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

      const { error } = await supabase
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

  async function deleteNote(noteId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
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
  // FILTER
  // =========================================================

  const visible = students.filter((s) => {
    const matchesGroup =
      groupId === "all" ||
      String(s.group_id) === groupId;

    const matchesSearch =
      s.full_name
        ?.toLowerCase()
        .includes(search.toLowerCase().trim());

    return matchesGroup && matchesSearch;
  });

  // =========================================================
  // LOADING / ERROR
  // =========================================================

  if (loading) {
    return <Loading />;
  }

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

      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <div className="page-heading">

        <div>
          <h1>Students</h1>

          <p>
            {profile?.role === "admin"
              ? "View and edit every student."
              : "View and edit students in your groups."}
          </p>
        </div>

        {/* ONLY ADMIN CAN CREATE STUDENTS */}

        {profile?.role === "admin" && (
          <button
            className="btn"
            onClick={() => {
              setEditing(null);

              setForm({
                ...blank,
                group_id: groups[0]?.id
                  ? String(groups[0].id)
                  : "",
              });

              setOpen(true);
            }}
          >
            + New student
          </button>
        )}

      </div>


      {/* =========================================
          FILTER
      ========================================= */}

<div className="toolbar students-toolbar">
  <input
    className="student-search"
    type="text"
    placeholder="Search by student name..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />

  <select
    value={groupId}
    onChange={(e) => setGroupId(e.target.value)}
  >
    <option value="all">All groups</option>

    {groups.map((g) => (
      <option value={g.id} key={g.id}>
        {g.name}
      </option>
    ))}
  </select>
</div>
      {/* =========================================
          STUDENTS TABLE
      ========================================= */}

      <div className="panel">

        <div className="table-wrap">

          <table>

            <thead>

              <tr>
                <th>Student</th>
                <th>Group</th>
                <th>Phone</th>
                <th>Parent phone</th>
                <th>Status</th>
                <th>Join date</th>
                <th>Notes</th>
                <th></th>
              </tr>

            </thead>

            <tbody>

              {visible.map((s) => (

                <tr key={s.id}>

                  {/* CLICK STUDENT NAME */}

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

                  <td>
                    {s.groups?.name || "—"}
                  </td>

                  <td>
                    {s.phone || "—"}
                  </td>

                  <td>
                    {s.parent_phone || "—"}
                  </td>

                  <td>

                    <span
                      className={`badge ${s.status}`}
                    >
                      {s.status}
                    </span>

                  </td>

                  <td>
                    {s.join_date || "—"}
                  </td>

                  {/* NOTES */}

                  <td>

                    <button
                      className="text-btn"
                      onClick={() =>
                        openStudent(s)
                      }
                    >
                      View notes
                    </button>

                  </td>

                  {/* EDIT */}

                  <td>

                    <button
                      className="text-btn"
                      onClick={() =>
                        startEdit(s)
                      }
                    >
                      Edit
                    </button>

                  </td>

                </tr>

              ))}

              {visible.length === 0 && (

                <tr>

                  <td
                    colSpan="8"
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      color: "#6b7280",
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


      {/* =========================================
          EDIT STUDENT MODAL
      ========================================= */}

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

            <label>
              Full name

              <input
                value={form.full_name}
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


            <label>
              Student phone

              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone:
                      e.target.value,
                  })
                }
              />

            </label>


            <label>
              Parent phone

              <input
                value={form.parent_phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    parent_phone:
                      e.target.value,
                  })
                }
              />

            </label>


            <label>
              Group

              <select
                value={form.group_id}
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


            <label>
              Status

              <select
                value={form.status}
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


            <label>
              Join date

              <input
                type="date"
                value={form.join_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    join_date:
                      e.target.value,
                  })
                }
              />

            </label>


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


      {/* =========================================
          STUDENT DETAILS + NOTES MODAL
      ========================================= */}

      {selectedStudent && (

        <Modal
          title={selectedStudent.full_name}
          onClose={closeStudent}
        >

          {/* STUDENT INFORMATION */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, 1fr)",
              gap: "12px",
              margin: "24px",
            }}
          >

            <div className="info-box">
              <strong>Group</strong>

              <span>
                {selectedStudent.groups?.name ||
                  "—"}
              </span>
            </div>


            <div className="info-box">
              <strong>Status</strong>

              <span>
                <span
                  className={`badge ${selectedStudent.status}`}
                >
                  {selectedStudent.status}
                </span>
              </span>
            </div>


            <div className="info-box">
              <strong>Student phone</strong>

              <span>
                {selectedStudent.phone ||
                  "—"}
              </span>
            </div>


            <div className="info-box">
              <strong>Parent phone</strong>

              <span>
                {selectedStudent.parent_phone ||
                  "—"}
              </span>
            </div>


            <div className="info-box">
              <strong>Join date</strong>

              <span>
                {selectedStudent.join_date ||
                  "—"}
              </span>
            </div>

          </div>


          {/* NOTES TITLE */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              margin: "12px",
            }}
          >

            <div>

              <h3>
                Notes
              </h3>

              <p
                style={{
                  color: "#6b7280",
                  fontSize: "13px",
                  marginTop: "4px",
                }}
              >
                Notes written by instructors
                and administrators.
              </p>

            </div>

            <span className="badge">
              {notes.length}{" "}
              {notes.length === 1
                ? "note"
                : "notes"}
            </span>

          </div>


          {/* ADD NOTE */}

          <div
            style={{
              margin: "20px",
            }}
          >

            <textarea
              value={newNote}
              onChange={(e) =>
                setNewNote(e.target.value)
              }
              placeholder="Write a note about this student..."
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                padding: "12px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "8px",
                fontFamily:
                  "inherit",
                outline: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                marginTop: "10px",
              }}
            >

              <button
                className="btn"
                type="button"
                disabled={
                  savingNote ||
                  !newNote.trim()
                }
                onClick={addNote}
              >
                {savingNote
                  ? "Saving..."
                  : "Add note"}
              </button>

            </div>

          </div>


          {/* NOTES LIST */}

          {notesLoading ? (

            <Loading />

          ) : notes.length === 0 ? (

            <div
              style={{
                padding: "30px",
                textAlign: "center",
                background: "#f9fafb",
                borderRadius: "8px",
                color: "#6b7280",
              }}
            >
              No notes have been added
              for this student yet.
            </div>

          ) : (

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                margin: "20px",
                gap: "12px",
              }}
            >

              {notes.map((note) => (

                <div
                  key={note.id}
                  style={{
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "14px",
                    background: "#fff",
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >

                    <div>

                      <strong>
                        {note.author_name ||
                          "Unknown"}
                      </strong>

                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "11px",
                          color: "#9ca3af",
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


                  <p
                    style={{
                      marginTop: "12px",
                      color: "#374151",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {note.note}
                  </p>

                </div>

              ))}

            </div>

          )}

        </Modal>

      )}

    </div>
  );
}