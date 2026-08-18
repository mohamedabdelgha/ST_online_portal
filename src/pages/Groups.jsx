import { useEffect, useState } from "react";
import { useAuth } from "../App";
import {
  listGroups,
  createGroup,
  updateGroup,
} from "../services/groupService";
import { listProfiles } from "../services/authService";
import Modal from "../components/Modal";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

const initial = {
  name: "",
  day: "Saturday",
  time: "17:00",
  max_students: 20,
  status: "active",
  instructor_id: "",
  daftara_link: "",
  classroom_link: "",
  whatsapp_link: "",
};

export default function Groups() {
  const { user, profile } = useAuth();

  const [groups, setGroups] = useState([]);
  const [instructors, setInstructors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState(initial);

  const isAdmin = profile?.role === "admin";

  async function load() {
    try {
      setLoading(true);
      setError("");

      const gs = await listGroups();

      setGroups(gs);

      if (isAdmin) {
        const profiles = await listProfiles();

        setInstructors(
          profiles.filter(
            (x) => x.role === "instructor"
          )
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user?.id, isAdmin]);

  // =========================================================
  // CREATE GROUP
  // =========================================================

  function startCreate() {
    setEditing(null);

    setForm({
      ...initial,
      instructor_id: isAdmin ? "" : user.id,
    });

    setOpen(true);
  }

  // =========================================================
  // EDIT GROUP
  // =========================================================

  function startEdit(group) {
    setEditing(group);

    setForm({
      name: group.name || "",
      day: group.day || "Saturday",
      time: group.time || "17:00",
      max_students: group.max_students || 20,
      status: group.status || "active",
      instructor_id: group.instructor_id || "",

      daftara_link:
        group.daftara_link || "",

      classroom_link:
        group.classroom_link || "",

      whatsapp_link:
        group.whatsapp_link || "",
    });

    setOpen(true);
  }

  // =========================================================
  // SUBMIT
  // =========================================================

  async function submit(e) {
    e.preventDefault();

    if (!editing && !isAdmin) {
      setError(
        "Only administrators can create groups."
      );
      return;
    }

    try {
      const payload = {
        ...form,

        max_students:
          Number(form.max_students),

        instructor_id: isAdmin
          ? form.instructor_id
          : user.id,

        daftara_link:
          form.daftara_link.trim() || null,

        classroom_link:
          form.classroom_link.trim() || null,

        whatsapp_link:
          form.whatsapp_link.trim() || null,
      };

      if (!payload.instructor_id) {
        throw new Error(
          "Please select an instructor."
        );
      }

      if (editing) {
        await updateGroup(
          editing.id,
          payload
        );
      } else {
        await createGroup(payload);
      }

      setOpen(false);

      await load();
    } catch (e) {
      setError(e.message);
    }
  }

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

      {/* PAGE HEADER */}

      <div className="page-heading">

        <div>
          <h1>
            {isAdmin
              ? "All Groups"
              : "My Groups"}
          </h1>

          <p>
            {isAdmin
              ? "View and edit every group."
              : "Manage only the groups assigned to you."}
          </p>
        </div>

        {isAdmin && (
          <button
            className="btn"
            onClick={startCreate}
          >
            + New group
          </button>
        )}

      </div>


      {/* GROUP CARDS */}

      <div className="card-grid">

        {groups.map((g) => (

          <div
            className="group-card"
            key={g.id}
          >

            <div className="group-top">

              <h3>
                {g.name}
              </h3>

              <span
                className={`badge ${g.status}`}
              >
                {g.status}
              </span>

            </div>


            <p>
              📅 {g.day}
              {" · "}
              ⏰ {g.time}
            </p>


            <p>
              Instructor:{" "}
              {g.profiles?.full_name ||
                "Unassigned"}
            </p>


            <p>
              Capacity:{" "}
              {g.max_students}
            </p>


            {/* GROUP LINKS */}

            <div
              className="group-links"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "18px",
              }}
            >

              {g.daftara_link && (
                isAdmin &&
                <a
                  href={g.daftara_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group-link daftara-link"
                >
                  📒 Daftara
                </a>
              
              )}

              {g.classroom_link && (
                <a
                  href={g.classroom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group-link classroom-link"
                >
                  🎓 Google Classroom
                </a>
              )}

              {g.whatsapp_link && (
                <a
                  href={g.whatsapp_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group-link whatsapp-link"
                >
                  💬 WhatsApp Group
                </a>
              )}

            </div>


            {/* EDIT */}

            {isAdmin && (
              <button
                className="text-btn"
                style={{
                  marginTop: "15px",
                }}
                onClick={() =>
                  startEdit(g)
                }
              >
                Edit
              </button>
            )}

          </div>

        ))}

      </div>


      {/* CREATE / EDIT MODAL */}

      {open && (

        <Modal
          title={
            editing
              ? "Edit group"
              : "Create group"
          }
          onClose={() =>
            setOpen(false)
          }
        >

          <form
            onSubmit={submit}
            className="form-grid"
          >

            {/* GROUP NAME */}

            <label>
              Group name

              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name:
                      e.target.value,
                  })
                }
                required
              />

            </label>


            {/* DAY */}

            <label>
              Day

              <select
                value={form.day}
                onChange={(e) =>
                  setForm({
                    ...form,
                    day:
                      e.target.value,
                  })
                }
              >

                {[
                  "Saturday",
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                ].map((d) => (

                  <option
                    key={d}
                    value={d}
                  >
                    {d}
                  </option>

                ))}

              </select>

            </label>


            {/* TIME */}

            <label>
              Time

              <input
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm({
                    ...form,
                    time:
                      e.target.value,
                  })
                }
              />

            </label>


            {/* MAX STUDENTS */}

            <label>
              Max students

              <input
                type="number"
                min="1"
                max="20"
                value={form.max_students}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_students:
                      e.target.value,
                  })
                }
              />

            </label>


            {/* STATUS */}

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

                <option value="onstart">
                  On Start
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="paused">
                  Paused
                </option>

                <option value="closed">
                  Closed
                </option>

              </select>

            </label>


            {/* INSTRUCTOR */}

            {isAdmin && (

              <label>
                Instructor

                <select
                  value={
                    form.instructor_id
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      instructor_id:
                        e.target.value,
                    })
                  }
                  required
                >

                  <option value="">
                    Select instructor
                  </option>

                  {instructors.map(
                    (i) => (

                      <option
                        key={i.id}
                        value={i.id}
                      >
                        {i.full_name}
                        {" "}
                        (
                        {i.email ||
                          "no email"}
                        )
                      </option>

                    )
                  )}

                </select>

              </label>

            )}


            {/* ===================================
                GROUP LINKS
            =================================== */}

            <div
              style={{
                gridColumn:
                  "1 / -1",
                marginTop: "8px",
              }}
            >

              <h3
                style={{
                  marginBottom: "5px",
                }}
              >
                Group Links
              </h3>

              <p
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  marginBottom: "15px",
                }}
              >
                These links will be displayed
                on the group card for instructors.
              </p>

            </div>


            {/* DAFTARA */}

            <label>
              Daftara link

              <input
                type="url"
                placeholder="https://..."
                value={
                  form.daftara_link
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    daftara_link:
                      e.target.value,
                  })
                }
              />

            </label>


            {/* CLASSROOM */}

            <label>
              Google Classroom link

              <input
                type="url"
                placeholder="https://classroom.google.com/..."
                value={
                  form.classroom_link
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    classroom_link:
                      e.target.value,
                  })
                }
              />

            </label>


            {/* WHATSAPP */}

            <label
              style={{
                gridColumn:
                  "1 / -1",
              }}
            >
              WhatsApp group link

              <input
                type="url"
                placeholder="https://chat.whatsapp.com/..."
                value={
                  form.whatsapp_link
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    whatsapp_link:
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
                  : "Create"}
              </button>

            </div>

          </form>

        </Modal>

      )}

    </div>
  );
}