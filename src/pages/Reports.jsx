import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../App";

import { listGroups } from "../services/groupService";
import { listStudents } from "../services/studentService";
import { listLectures } from "../services/lectureService";
import {
listHomework,
listGrades,
} from "../services/homeworkService";

import { supabase } from "../lib/supabase";

import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

export default function Reports() {
const { profile } = useAuth();

const isAdmin = profile?.role === "admin";

const [d, setD] = useState(null);

const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

// ==========================================
// NOTES REPORT
// ==========================================

const [studentNotes, setStudentNotes] = useState([]);
const [notesLoading, setNotesLoading] = useState(false);

const [studentSearch, setStudentSearch] = useState("");
const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");

async function load() {
try {
    setLoading(true);
    setError("");

    const gs = await listGroups();

    const ids = gs.map((g) => g.id);

    const [ss, ls, hw] = await Promise.all([
    listStudents(ids),
    listLectures(ids),
    listHomework(ids),
    ]);

    const grades = await listGrades(
    hw.map((x) => x.id)
    );

    const avg = grades.length
    ? Math.round(
        grades.reduce(
            (a, x) =>
            a + Number(x.score || 0),
            0
        ) / grades.length
        )
    : 0;

    setD({
    gs,
    ss,
    ls,
    hw,
    grades,
    avg,
    });

    // Only admin needs all student notes
    if (isAdmin) {
    await loadStudentNotes();
    }
} catch (e) {
    setError(e.message);
} finally {
    setLoading(false);
}
}

// ==========================================
// LOAD STUDENT NOTES
// ==========================================

async function loadStudentNotes() {
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
        created_at,
        students (
        id,
        full_name,
        group_id,
        groups (
            id,
            name
        )
        )
    `)
    .order("created_at", {
        ascending: false,
    });

    if (error) {
    throw error;
    }

    setStudentNotes(data || []);
} catch (e) {
    console.error(
    "Error loading student notes:",
    e
    );

    setStudentNotes([]);

    if (isAdmin) {
    setError(e.message);
    }
} finally {
    setNotesLoading(false);
}
}

useEffect(() => {
load();
}, [profile?.id, isAdmin]);

// ==========================================
// FILTER NOTES
// ==========================================

const filteredNotes = useMemo(() => {
const search =
    studentSearch.trim().toLowerCase();

return studentNotes.filter((item) => {
    const studentName =
    item.students?.full_name
        ?.toLowerCase() || "";

    const noteDate =
    item.created_at
        ? new Date(item.created_at)
        : null;

    // Student name filter
    const matchesStudent =
    !search ||
    studentName.includes(search);

    // From date filter
    let matchesFromDate = true;

    if (fromDate && noteDate) {
    const start = new Date(
        `${fromDate}T00:00:00`
    );

    matchesFromDate =
        noteDate >= start;
    }

    // To date filter
    let matchesToDate = true;

    if (toDate && noteDate) {
    const end = new Date(
        `${toDate}T23:59:59.999`
    );

    matchesToDate =
        noteDate <= end;
    }

    return (
    matchesStudent &&
    matchesFromDate &&
    matchesToDate
    );
});
}, [
studentNotes,
studentSearch,
fromDate,
toDate,
]);

// ==========================================
// LOADING
// ==========================================

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

return (
<div>

    {/* ======================================
        PAGE HEADER
    ====================================== */}

    <div className="page-heading">

    <div>

        <h1>
        Reports
        </h1>

        <p>
        {isAdmin
            ? "Whole-system overview and student reports."
            : "Overview of your teaching activity."}
        </p>

    </div>

    </div>


    {/* ======================================
        GENERAL STATISTICS
    ====================================== */}

    <div className="stats-grid">

    <div className="stat-card">
        <span>Groups</span>
        <strong>
        {d.gs.length}
        </strong>
    </div>

    <div className="stat-card">
        <span>Students</span>
        <strong>
        {d.ss.length}
        </strong>
    </div>

    <div className="stat-card">
        <span>Lectures</span>
        <strong>
        {d.ls.length}
        </strong>
    </div>

    <div className="stat-card">
        <span>Average grade</span>
        <strong>
        {d.avg}%
        </strong>
    </div>

    </div>


    {/* ======================================
        GROUP OVERVIEW
    ====================================== */}

    <div className="panel">

    <div className="panel-head">

        <h3>
        Group overview
        </h3>

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

            {d.gs.map((g) => (

            <tr key={g.id}>

                <td>
                {g.name}
                </td>

                <td>
                {g.profiles?.full_name ||
                    "—"}
                </td>

                <td>
                {
                    d.ss.filter(
                    (s) =>
                        s.group_id === g.id
                    ).length
                }
                </td>

                <td>
                {
                    d.ls.filter(
                    (l) =>
                        l.group_id === g.id
                    ).length
                }
                </td>

                <td>
                {
                    d.hw.filter(
                    (h) =>
                        h.group_id === g.id
                    ).length
                }
                </td>

            </tr>

            ))}

        </tbody>

        </table>

    </div>

    </div>


    {/* ======================================
        ADMIN STUDENT NOTES REPORT
    ====================================== */}

    {isAdmin && (

    <div
        className="panel"
        style={{
        marginTop: "25px",
        }}
    >

        <div className="panel-head">

        <div>

            <h3>
            Student Notes Report
            </h3>

            <p
            style={{
                marginTop: "5px",
                color: "#6b7280",
                fontSize: "13px",
            }}
            >
            View notes written about students
            by instructors and administrators.
            </p>

        </div>

        </div>


        {/* ===============================
            FILTERS
        =============================== */}

        <div
        className="toolbar"
        style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
            padding: "15px",
        }}
        >

        {/* STUDENT SEARCH */}

        <input
            type="text"
            placeholder="Search by student name..."
            value={studentSearch}
            onChange={(e) =>
            setStudentSearch(
                e.target.value
            )
            }
            style={{
            minWidth: "260px",
            }}
        />


        {/* FROM DATE */}

        <div
            style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            }}
        >

            <label
            style={{
                fontSize: "13px",
                color: "#6b7280",
            }}
            >
            From
            </label>

            <input
            type="date"
            value={fromDate}
            onChange={(e) =>
                setFromDate(
                e.target.value
                )
            }
            />

        </div>


        {/* TO DATE */}

        <div
            style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            }}
        >

            <label
            style={{
                fontSize: "13px",
                color: "#6b7280",
            }}
            >
            To
            </label>

            <input
            type="date"
            value={toDate}
            onChange={(e) =>
                setToDate(
                e.target.value
                )
            }
            />

        </div>


        {/* CLEAR */}

        {(studentSearch ||
            fromDate ||
            toDate) && (

            <button
            className="btn secondary"
            onClick={() => {
                setStudentSearch("");
                setFromDate("");
                setToDate("");
            }}
            >
            Clear filters
            </button>

        )}

        </div>


        {/* ===============================
            RESULT COUNT
        =============================== */}

        <div
        style={{
            padding:
            "0 15px 15px",
            color: "#6b7280",
            fontSize: "13px",
        }}
        >
        Showing{" "}
        <strong>
            {filteredNotes.length}
        </strong>{" "}
        notes
        </div>


        {/* ===============================
            TABLE
        =============================== */}

        {notesLoading ? (

        <Loading />

        ) : (

        <div className="table-wrap">

            <table>

            <thead>

                <tr>
                <th>Student</th>
                <th>Group</th>
                <th>Note</th>
                <th>Written by</th>
                <th>Date</th>
                </tr>

            </thead>

            <tbody>

                {filteredNotes.length === 0 ? (

                <tr>

                    <td
                    colSpan="5"
                    style={{
                        textAlign:
                        "center",
                        padding:
                        "35px",
                        color:
                        "#6b7280",
                    }}
                    >
                    No notes found
                    matching the selected
                    filters.
                    </td>

                </tr>

                ) : (

                filteredNotes.map(
                    (item) => (

                    <tr
                        key={item.id}
                    >

                        <td>

                        <strong>
                            {
                            item.students
                                ?.full_name ||
                            "Unknown student"
                            }
                        </strong>

                        </td>


                        <td>

                        {
                            item.students
                            ?.groups
                            ?.name ||
                            "—"
                        }

                        </td>


                        <td
                        style={{
                            maxWidth:
                            "450px",
                            whiteSpace:
                            "pre-wrap",
                            lineHeight:
                            "1.5",
                        }}
                        >

                        {item.note}

                        </td>


                        <td>

                        {
                            item.author_name ||
                            "Unknown"
                        }

                        </td>


                        <td>

                        {item.created_at
                            ? new Date(
                                item.created_at
                            ).toLocaleString()
                            : "—"}

                        </td>

                    </tr>

                    )
                )

                )}

            </tbody>

            </table>

        </div>

        )}

    </div>

    )}

</div>
);
}