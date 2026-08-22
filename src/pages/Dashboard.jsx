import { useEffect, useState } from "react";
import { useAuth } from "../App";

import { listGroups } from "../services/groupService";
import { listStudents } from "../services/studentService";
import { listLectures } from "../services/lectureService";
import { listHomework } from "../services/homeworkService";

import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

export default function Dashboard() {
  const { profile } = useAuth();

  const isAdmin = profile?.role === "admin";

  const [data, setData] = useState({
    groups: [],
    students: [],
    lectures: [],
    homework: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      /*
       * listGroups() must already be protected by Supabase RLS:
       *
       * Admin      -> all groups
       * Instructor -> only assigned groups
       */
      const groups = await listGroups();

      const groupIds = groups.map(
        (group) => group.id
      );

      const [
        students,
        lectures,
        homework,
      ] = await Promise.all([
        listStudents(groupIds),
        listLectures(groupIds),
        listHomework(groupIds),
      ]);

      setData({
        groups,
        students,
        lectures,
        homework,
      });
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profile?.id) {
      load();
    }
  }, [profile?.id]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={load}
      />
    );
  }

  // =========================================================
  // DATE
  // =========================================================

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  // Today's lectures
  const todayLectures =
    data.lectures.filter(
      (lecture) =>
        lecture.lecture_date === today
    );

  // Completed lectures
  const completedLectures =
    data.lectures.filter(
      (lecture) =>
        lecture.status === "completed"
    );

  // Scheduled lectures
  const scheduledLectures =
    data.lectures.filter(
      (lecture) =>
        lecture.status === "scheduled"
    );

  // =========================================================
  // TITLE
  // =========================================================

  const title = isAdmin
    ? "Admin Dashboard"
    : "Instructor Dashboard";

  const description = isAdmin
    ? "Manage the whole education operation."
    : "Manage your groups, students and teaching activity.";

  return (
    <div>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="page-heading">

        <div>

          <h1>
            {title}
          </h1>

          <p>
            {description}
          </p>

        </div>

      </div>


      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <div className="stats-grid">

        {/* GROUPS */}

        <div className="stat-card">

          <span>
            {isAdmin
              ? "Total groups"
              : "My groups"}
          </span>

          <strong>
            {data.groups.length}
          </strong>

        </div>


        {/* STUDENTS */}

        <div className="stat-card">

          <span>
            {isAdmin
              ? "Total students"
              : "My students"}
          </span>

          <strong>
            {data.students.length}
          </strong>

        </div>


        {/* TODAY'S LECTURES */}

        <div className="stat-card">

          <span>
            Today's lectures
          </span>

          <strong>
            {todayLectures.length}
          </strong>

        </div>


        {/* HOMEWORK */}

        <div className="stat-card">

          <span>
            {isAdmin
              ? "Total homework"
              : "My homework"}
          </span>

          <strong>
            {data.homework.length}
          </strong>

        </div>

      </div>

{profile?.role === "admin" ? (
  <div className="dashboard-tables-grid">

    {/* =========================
        TODAY'S LECTURES
    ========================= */}

    <div className="panel">

      <div className="panel-head">
        <h3>Today's lectures</h3>
        <span>{today}</span>
      </div>

      {todayLectures.length === 0 ? (
        <div className="empty">
          No lectures scheduled today.
        </div>
      ) : (
        <div className="table-wrap">
          <table>

            <thead>
              <tr>
                <th>Group</th>
                <th>Instructor</th>
                <th>Title</th>
                <th>Start</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {todayLectures.map((l) => (
                <tr key={l.id}>

                  <td>
                    {l.groups?.name || "—"}
                  </td>

                  <td>
                    {l.profiles?.full_name || "—"}
                  </td>

                  <td>
                    {l.title}
                  </td>

                  <td>
                    {l.start_time || "—"}
                  </td>

                  <td>
                    <span
                      className={`badge ${l.status}`}
                    >
                      {l.status}
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}

    </div>

    {/* =========================
        GROUP OVERVIEW
    ========================= */}

    <div className="panel">

      <div className="panel-head">
        <h3>Group overview</h3>
      </div>

      <div className="table-wrap">
        <table>

          <thead>
            <tr>
              <th>Group</th>
              <th>Instructor</th>
              <th>Students</th>
              <th>Lectures</th>
              <th>Homework</th>
            </tr>
          </thead>

          <tbody>

            {data.groups.map((g) => (
              <tr key={g.id}>

                <td>
                  {g.name}
                </td>

                <td>
                  {g.profiles?.full_name || "—"}
                </td>

                <td>
                  {
                    data.students.filter(
                      (s) => s.group_id === g.id
                    ).length
                  }
                </td>

                <td>
                  {
                    data.lectures.filter(
                      (l) => l.group_id === g.id
                    ).length
                  }
                </td>

                <td>
                  {
                    data.homework.filter(
                      (h) => h.group_id === g.id
                    ).length
                  }
                </td>

              </tr>
            ))}

          </tbody>

        </table>
      </div>

    </div>


  </div>
) : (
  /* =========================
     INSTRUCTOR
  ========================= */

  <div className="panel">

    <div className="panel-head">
      <h3>Today's lectures</h3>
      <span>{today}</span>
    </div>

    {todayLectures.length === 0 ? (
      <div className="empty">
        No lectures scheduled today.
      </div>
    ) : (
      <div className="table-wrap">
        <table>

          <thead>
            <tr>
              <th>Group</th>
              <th>Instructor</th>
              <th>Title</th>
              <th>Start</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {todayLectures.map((l) => (
              <tr key={l.id}>

                <td>
                  {l.groups?.name || "—"}
                </td>

                <td>
                  {l.profiles?.full_name || "—"}
                </td>

                <td>
                  {l.title}
                </td>

                <td>
                  {l.start_time || "—"}
                </td>

                <td>
                  <span
                    className={`badge ${l.status}`}
                  >
                    {l.status}
                  </span>
                </td>

              </tr>
            ))}

          </tbody>

        </table>
      </div>
    )}

  </div>
)}
    </div>
  );
}