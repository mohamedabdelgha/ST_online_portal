import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { listGroups } from "../services/groupService";
import {
  listLectures,
  createLecture,
  updateLecture,
} from "../services/lectureService";
import { supabase } from "../lib/supabase";

import Modal from "../components/Modal";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

const blank = {
  group_id: "",
  title: "",
  description: "",
  lecture_date: new Date()
    .toISOString()
    .slice(0, 10),
  start_time: "17:00",
  end_time: "18:00",
  meeting_link: "",
  status: "scheduled",
};

const feedbackBlank = {
  understanding: 0,
  involvement: 0,
  technical: 0,
  activity: 0,
};

export default function Lectures() {
  const { user, profile } = useAuth();

  const isAdmin = profile?.role === "admin";

  const [groups, setGroups] = useState([]);
  const [lectures, setLectures] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Admin create/edit modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  // Instructor report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLecture, setReportLecture] = useState(null);

  const [reportDescription, setReportDescription] =
    useState("");

  const [reportStatus, setReportStatus] =
    useState("scheduled");

  const [students, setStudents] = useState([]);
  const [feedback, setFeedback] = useState({});

  const [reportLoading, setReportLoading] =
    useState(false);

  const [savingReport, setSavingReport] =
    useState(false);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const gs = await listGroups();

      setGroups(gs);

      const lectureData = await listLectures(
        gs.map((g) => g.id)
      );

      setLectures(lectureData);
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
  // ADMIN - CREATE
  // =========================================================

  function startCreate() {
    if (!isAdmin) {
      return;
    }

    setEditing(null);

    setForm({
      ...blank,
      group_id: groups[0]?.id
        ? String(groups[0].id)
        : "",
    });

    setOpen(true);
  }

  // =========================================================
  // ADMIN - EDIT
  // =========================================================

  function startEdit(lecture) {
    if (!isAdmin) {
      return;
    }

    setEditing(lecture);

    setForm({
      group_id: String(lecture.group_id),
      title: lecture.title,
      description: lecture.description || "",
      lecture_date: lecture.lecture_date,
      start_time: lecture.start_time || "",
      end_time: lecture.end_time || "",
      meeting_link:
        lecture.meeting_link || "",
      status: lecture.status,
    });

    setOpen(true);
  }

  // =========================================================
  // ADMIN - CREATE / UPDATE
  // =========================================================

  async function submit(e) {
    e.preventDefault();

    if (!isAdmin) {
      setError(
        "Only administrators can edit lectures."
      );
      return;
    }

    try {
      const group = groups.find(
        (g) =>
          String(g.id) ===
          String(form.group_id)
      );

      if (!group?.instructor_id) {
        throw new Error(
          "The selected group has no instructor. Assign one to the group first."
        );
      }

      const payload = {
        ...form,
        group_id: Number(form.group_id),
        instructor_id:
          group.instructor_id,
      };

      if (editing) {
        await updateLecture(
          editing.id,
          payload
        );
      } else {
        await createLecture(payload);
      }

      setOpen(false);

      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  // =========================================================
  // INSTRUCTOR - OPEN REPORT
  // =========================================================

  async function openReport(lecture) {
    setReportLecture(lecture);

    setReportDescription(
      lecture.description || ""
    );

    setReportStatus(
      lecture.status || "scheduled"
    );

    setReportOpen(true);

    await loadReportData(lecture);
  }

  // =========================================================
  // LOAD STUDENTS + EXISTING FEEDBACK
  // =========================================================

  async function loadReportData(lecture) {
    try {
      setReportLoading(true);

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(`
          id,
          full_name,
          group_id
        `)
        .eq("group_id", lecture.group_id)
        .order("full_name");

      if (studentError) {
        throw studentError;
      }

      setStudents(studentData || []);

      const {
        data: feedbackData,
        error: feedbackError,
      } = await supabase
        .from("lecture_feedback")
        .select(`
          id,
          student_id,
          understanding,
          involvement,
          technical,
          activity
        `)
        .eq(
          "lecture_id",
          lecture.id
        );

      if (feedbackError) {
        throw feedbackError;
      }

      const feedbackMap = {};

      for (const item of feedbackData || []) {
        feedbackMap[item.student_id] = {
          understanding:
            Number(item.understanding) || 0,

          involvement:
            Number(item.involvement) || 0,

          technical:
            Number(item.technical) || 0,

          activity:
            Number(item.activity) || 0,

          id: item.id,
        };
      }

      // Give every student default values
      for (const student of studentData || []) {
        if (!feedbackMap[student.id]) {
          feedbackMap[student.id] = {
            ...feedbackBlank,
          };
        }
      }

      setFeedback(feedbackMap);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setReportLoading(false);
    }
  }

  // =========================================================
  // CHANGE FEEDBACK
  // =========================================================

  function changeFeedback(
    studentId,
    field,
    value
  ) {
    let numericValue =
      Number(value);

    if (Number.isNaN(numericValue)) {
      numericValue = 0;
    }

    numericValue =
      Math.min(
        100,
        Math.max(0, numericValue)
      );

    setFeedback((previous) => ({
      ...previous,

      [studentId]: {
        ...(previous[studentId] ||
          feedbackBlank),

        [field]: numericValue,
      },
    }));
  }

  // =========================================================
  // INSTRUCTOR - SAVE REPORT
  // =========================================================

  async function saveReport() {
    if (!reportLecture) {
      return;
    }

    try {
      setSavingReport(true);

      const {
        data: {
          user: currentUser,
        },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        throw new Error(
          "You must be logged in."
        );
      }

      /*
       * Instructor can change only:
       * - description
       * - status
       */

      const {
        error: lectureError,
      } = await supabase.rpc(
        "submit_lecture_report",
        {
          p_lecture_id: reportLecture.id,
          p_description: reportDescription,
          p_status: reportStatus,
        }
      );

      if (lectureError) {
        throw lectureError;
      }

      /*
       * Save feedback for every student.
       */

      const feedbackRows =
        students.map((student) => {
          const studentFeedback =
            feedback[
              student.id
            ] || feedbackBlank;

          return {
            lecture_id:
              reportLecture.id,

            student_id:
              student.id,

            instructor_id:
              currentUser.id,

            understanding:
              Number(
                studentFeedback
                  .understanding
              ) || 0,

            involvement:
              Number(
                studentFeedback
                  .involvement
              ) || 0,

            technical:
              Number(
                studentFeedback
                  .technical
              ) || 0,

            activity:
              Number(
                studentFeedback
                  .activity
              ) || 0,
          };
        });

      if (feedbackRows.length > 0) {
        const {
          error: feedbackError,
        } = await supabase
          .from("lecture_feedback")
          .upsert(
            feedbackRows,
            {
              onConflict:
                "lecture_id,student_id",
            }
          );

        if (feedbackError) {
          throw feedbackError;
        }
      }

      setReportOpen(false);

      await load();
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setSavingReport(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (error && !open && !reportOpen) {
    return (
      <ErrorState
        message={error}
        onRetry={load}
      />
    );
  }

  return (
    <div>

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="page-heading">

        <div>

          <h1>
            Lectures
          </h1>

          <p>
            {isAdmin
              ? "View and edit every lecture."
              : "Write reports and student feedback for your lectures."}
          </p>

        </div>

        {/* ONLY ADMIN CAN CREATE */}

        {isAdmin && (
          <button
            className="btn"
            onClick={startCreate}
          >
            + New lecture
          </button>
        )}

      </div>


      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="panel">

        <div className="table-wrap">

          <table>

            <thead>

              <tr>
                <th>Group</th>
                <th>Instructor</th>
                <th>Title</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>

            </thead>

            <tbody>

              {lectures.map((lecture) => (

                <tr key={lecture.id}>

                  <td>
                    {lecture.groups?.name ||
                      "—"}
                  </td>

                  <td>
                    {lecture.profiles
                      ?.full_name ||
                      "—"}
                  </td>

                  <td>
                    {lecture.title}
                  </td>

                  <td>
                    {lecture.lecture_date}
                  </td>

                  <td>
                    {lecture.start_time ||
                      "—"}
                  </td>

                  <td>

                    <span
                      className={`badge ${lecture.status}`}
                    >
                      {lecture.status}
                    </span>

                  </td>

                  <td>

                    {isAdmin ? (

                      <button
                        className="text-btn"
                        onClick={() =>
                          startEdit(
                            lecture
                          )
                        }
                      >
                        Edit
                      </button>

                    ) : (

                      <button
                        className="btn"
                        onClick={() =>
                          openReport(
                            lecture
                          )
                        }
                      >
                        Make report
                      </button>

                    )}

                  </td>

                </tr>

              ))}

              {lectures.length === 0 && (

                <tr>

                  <td
                    colSpan="7"
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      color: "#6b7280",
                    }}
                  >
                    No lectures found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* =====================================================
          ADMIN CREATE / EDIT MODAL
      ===================================================== */}

      {open && isAdmin && (

        <Modal
          title={
            editing
              ? "Edit lecture"
              : "Create lecture"
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
                    value={g.id}
                    key={g.id}
                  >
                    {g.name}
                    {" — "}
                    {g.profiles
                      ?.full_name ||
                      "No instructor"}
                  </option>

                ))}

              </select>

            </label>


            <label>
              Title

              <input
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title:
                      e.target.value,
                  })
                }
                required
              />

            </label>


            <label>
              Date

              <input
                type="date"
                value={form.lecture_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    lecture_date:
                      e.target.value,
                  })
                }
                required
              />

            </label>


            <label>
              Start

              <input
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm({
                    ...form,
                    start_time:
                      e.target.value,
                  })
                }
              />

            </label>


            <label>
              End

              <input
                type="time"
                value={form.end_time}
                onChange={(e) =>
                  setForm({
                    ...form,
                    end_time:
                      e.target.value,
                  })
                }
              />

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

                <option value="scheduled">
                  Scheduled
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="cancelled">
                  Cancelled
                </option>

              </select>

            </label>


            <label>
              Meeting link

              <input
                type="url"
                value={
                  form.meeting_link
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    meeting_link:
                      e.target.value,
                  })
                }
              />

            </label>


            <label className="full">
              Description

              <textarea
                value={
                  form.description
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    description:
                      e.target.value,
                  })
                }
              />

            </label>


            <div className="form-actions">

              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  setOpen(false)
                }
              >
                Cancel
              </button>

              <button className="btn">
                {editing
                  ? "Save changes"
                  : "Create"}
              </button>

            </div>

          </form>

        </Modal>

      )}


      {/* =====================================================
          INSTRUCTOR REPORT MODAL
      ===================================================== */}

      {reportOpen &&
        reportLecture && (

          <Modal
            title={`Lecture Report — ${reportLecture.title}`}
            onClose={() =>
              setReportOpen(false)
            }
          >

            {reportLoading ? (

              <Loading />

            ) : (

              <div style={{
                margin:"7px"
              }}>

                {/* ==============================
                    LECTURE INFO
                ============================== */}

                <div
                  style={{
                    background:
                      "#f8fafc",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius:
                      "8px",
                    padding:
                      "15px",
                    marginBottom:
                      "20px",
                  }}
                >

                  <strong>
                    {
                      reportLecture
                        .groups?.name
                    }
                  </strong>

                  <p
                    style={{
                      color:
                        "#6b7280",
                      fontSize:
                        "13px",
                      marginTop:
                        "5px",
                    }}
                  >
                    {
                      reportLecture
                        .lecture_date
                    }

                    {" · "}

                    {
                      reportLecture
                        .start_time
                    }
                  </p>

                </div>


                {/* ==============================
                    STATUS
                ============================== */}

                <label
                  style={{
                    display:
                      "block",
                    marginBottom:
                      "10px",
                  }}
                >

                  Lecture status

                  <select
                    value={
                      reportStatus
                    }
                    onChange={(e) =>
                      setReportStatus(
                        e.target.value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      marginTop:
                        "7px",
                    }}
                  >

                    <option value="scheduled">
                      Scheduled
                    </option>

                    <option value="completed">
                      Completed
                    </option>

                    <option value="cancelled">
                      Cancelled
                    </option>

                  </select>

                </label>


                {/* ==============================
                    REPORT DESCRIPTION
                ============================== */}

                <label
                  style={{
                    display:
                      "block",
                    marginBottom:                      
                      "10px",
                  }}
                >

                  Lecture report

                  <textarea
                    value={
                      reportDescription
                    }
                    onChange={(e) =>
                      setReportDescription(
                        e.target.value
                      )
                    }
                    placeholder="Write what happened during the lecture..."
                    rows={7}
                    style={{
                      width:
                        "100%",
                      marginTop:
                        "7px",
                    }}
                  />

                </label>


                {/* ==============================
                    STUDENT FEEDBACK
                ============================== */}

                <div
                  style={{
                    marginBottom:
                      "10px",
                  }}
                >

                  <h3>
                    Student Feedback
                  </h3>

                  <p
                    style={{
                      color:
                        "#6b7280",
                      fontSize:
                        "13px",
                      marginTop:
                        "5px",
                    }}
                  >
                    Rate each student from
                    0% to 100%.
                  </p>

                </div>


                {students.length === 0 ? (

                  <div
                    style={{
                      padding:
                        "25px",
                      textAlign:
                        "center",
                      color:
                        "#6b7280",
                      background:
                        "#f8fafc",
                      borderRadius:
                        "8px",
                    }}
                  >
                    No students found
                    in this group.
                  </div>

                ) : (

                  <div
                    className="table-wrap"
                  >

                    <table>

                      <thead>

                        <tr>

                          <th>
                            Student
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

                        </tr>

                      </thead>

                      <tbody>

                        {students.map(
                          (student) => {

                            const values =
                              feedback[
                                student.id
                              ] ||
                              feedbackBlank;

                            return (

                              <tr
                                key={
                                  student.id
                                }
                              >

                                <td>

                                  <strong>
                                    {
                                      student.full_name
                                    }
                                  </strong>

                                </td>


                                <td>

                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                      values.understanding
                                    }
                                    onChange={(e) =>
                                      changeFeedback(
                                        student.id,
                                        "understanding",
                                        e.target.value
                                      )
                                    }
                                    style={{
                                      width:
                                        "80px",
                                    }}
                                  />

                                </td>


                                <td>

                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                      values.involvement
                                    }
                                    onChange={(e) =>
                                      changeFeedback(
                                        student.id,
                                        "involvement",
                                        e.target.value
                                      )
                                    }
                                    style={{
                                      width:
                                        "80px",
                                    }}
                                  />

                                </td>


                                <td>

                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                      values.technical
                                    }
                                    onChange={(e) =>
                                      changeFeedback(
                                        student.id,
                                        "technical",
                                        e.target.value
                                      )
                                    }
                                    style={{
                                      width:
                                        "80px",
                                    }}
                                  />

                                </td>


                                <td>

                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                      values.activity
                                    }
                                    onChange={(e) =>
                                      changeFeedback(
                                        student.id,
                                        "activity",
                                        e.target.value
                                      )
                                    }
                                    style={{
                                      width:
                                        "80px",
                                    }}
                                  />

                                </td>

                              </tr>

                            );
                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                )}


                {/* ==============================
                    ACTIONS
                ============================== */}

                <div
                  className="form-actions"
                  style={{
                    marginTop:
                      "25px",
                  }}
                >

                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() =>
                      setReportOpen(false)
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn"
                    disabled={
                      savingReport
                    }
                    onClick={
                      saveReport
                    }
                  >
                    {savingReport
                      ? "Saving..."
                      : "Save report"}
                  </button>

                </div>

              </div>

            )}

          </Modal>

        )}

    </div>
  );
}