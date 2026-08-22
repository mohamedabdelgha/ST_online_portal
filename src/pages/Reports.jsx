import React, { useEffect, useMemo, useState } from "react";
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

// =========================================================
// STUDENT NOTES REPORT
// =========================================================

const [studentNotes, setStudentNotes] = useState([]);
const [notesLoading, setNotesLoading] = useState(false);

const [studentSearch, setStudentSearch] = useState("");
const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");

// =========================================================
// LECTURE REPORT
// =========================================================

const [lectureSearch, setLectureSearch] = useState("");
const [lectureGroup, setLectureGroup] = useState("all");
const [lectureStatus, setLectureStatus] = useState("all");
const [lectureFromDate, setLectureFromDate] = useState("");
const [lectureToDate, setLectureToDate] = useState("");

// Which lecture is currently expanded
const [expandedLectureId, setExpandedLectureId] =
useState(null);

// =========================================================
// LOAD ALL DATA
// =========================================================

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
    console.error(e);
    setError(e.message);
} finally {
    setLoading(false);
}
}

// =========================================================
// LOAD STUDENT NOTES
// =========================================================

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

// =========================================================
// FILTER STUDENT NOTES
// =========================================================

const filteredNotes = useMemo(() => {
const search =
    studentSearch.trim().toLowerCase();

return studentNotes.filter((item) => {
    const studentName =
    item.students?.full_name
        ?.toLowerCase() || "";

    const noteDate = item.created_at
    ? new Date(item.created_at)
    : null;

    const matchesStudent =
    !search ||
    studentName.includes(search);

    let matchesFromDate = true;

    if (fromDate && noteDate) {
    const start = new Date(
        `${fromDate}T00:00:00`
    );

    matchesFromDate =
        noteDate >= start;
    }

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

// =========================================================
// FILTER LECTURES
// =========================================================

const filteredLectures = useMemo(() => {
const search =
    lectureSearch.trim().toLowerCase();

return (d?.ls || []).filter((lecture) => {
    const title =
    lecture.title
        ?.toLowerCase() || "";

    const description =
    lecture.description
        ?.toLowerCase() || "";

    const groupName =
    lecture.groups?.name
        ?.toLowerCase() || "";

    const instructorName =
    lecture.profiles?.full_name
        ?.toLowerCase() || "";

    const matchesSearch =
    !search ||
    title.includes(search) ||
    description.includes(search) ||
    groupName.includes(search) ||
    instructorName.includes(search);

    const matchesGroup =
    lectureGroup === "all" ||
    String(lecture.group_id) ===
        String(lectureGroup);

    const matchesStatus =
    lectureStatus === "all" ||
    lecture.status === lectureStatus;

    let matchesFromDate = true;

    if (
    lectureFromDate &&
    lecture.lecture_date
    ) {
    matchesFromDate =
        lecture.lecture_date >=
        lectureFromDate;
    }

    let matchesToDate = true;

    if (
    lectureToDate &&
    lecture.lecture_date
    ) {
    matchesToDate =
        lecture.lecture_date <=
        lectureToDate;
    }

    return (
    matchesSearch &&
    matchesGroup &&
    matchesStatus &&
    matchesFromDate &&
    matchesToDate
    );
});
}, [
d?.ls,
lectureSearch,
lectureGroup,
lectureStatus,
lectureFromDate,
lectureToDate,
]);

// =========================================================
// TOGGLE LECTURE
// =========================================================

function toggleLecture(lectureId) {
setExpandedLectureId((current) =>
    current === lectureId
    ? null
    : lectureId
);
}

// =========================================================
// CLEAR LECTURE FILTERS
// =========================================================

function clearLectureFilters() {
setLectureSearch("");
setLectureGroup("all");
setLectureStatus("all");
setLectureFromDate("");
setLectureToDate("");
setExpandedLectureId(null);
}

// =========================================================
// CLEAR NOTE FILTERS
// =========================================================

function clearNoteFilters() {
setStudentSearch("");
setFromDate("");
setToDate("");
}

// =========================================================
// LOADING
// =========================================================

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

    {/* =====================================================
        PAGE HEADER
    ===================================================== */}

    <div className="page-heading">

    <div>

        <h1>
        Reports
        </h1>

        <p>
        {isAdmin
            ? "Whole-system overview and reports."
            : "Overview of your teaching activity."}
        </p>

    </div>

    </div>


    {/* =====================================================
        GENERAL STATISTICS
    ===================================================== */}

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


    {/* =====================================================
        ADMIN ONLY - ALL LECTURES REPORT
    ===================================================== */}

    {isAdmin && (

    <div
        className="panel"
        style={{
        marginTop: "25px",
        }}
    >

        {/* HEADER */}

        <div className="panel-head">

        <div>

            <h3>
            All Lectures Report
            </h3>

            <p
            style={{
                marginTop: "5px",
                color: "#6b7280",
                fontSize: "13px",
            }}
            >
            Click a lecture to view its report
            and details.
            </p>

        </div>

        </div>


        {/* =================================================
            LECTURE FILTERS
        ================================================= */}

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

        <div
            style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: "7px",
            }}
        >
                    {/* SEARCH */}

        <input
            type="text"
            placeholder="Search lecture, group or instructor..."
            value={lectureSearch}
            onChange={(e) =>
            setLectureSearch(
                e.target.value
            )
            }
            style={{
            minWidth: "280px",
            }}
        />


        {/* GROUP */}

        <select
            value={lectureGroup}
            onChange={(e) =>
            setLectureGroup(
                e.target.value
            )
            }
        >

            <option value="all">
            All groups
            </option>

            {d.gs.map((group) => (

            <option
                key={group.id}
                value={group.id}
            >
                {group.name}
            </option>

            ))}

        </select>


        {/* STATUS */}

        <select
            value={lectureStatus}
            onChange={(e) =>
            setLectureStatus(
                e.target.value
            )
            }
        >

            <option value="all">
            All statuses
            </option>

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

        </div>

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
            value={lectureFromDate}
            onChange={(e) =>
                setLectureFromDate(
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
            value={lectureToDate}
            onChange={(e) =>
                setLectureToDate(
                e.target.value
                )
            }
            />

        </div>


        {/* CLEAR */}

        {(lectureSearch ||
            lectureGroup !== "all" ||
            lectureStatus !== "all" ||
            lectureFromDate ||
            lectureToDate) && (

            <button
            className="btn secondary"
            onClick={
                clearLectureFilters
            }
            >
            Clear filters
            </button>

        )}

        </div>


        {/* RESULT COUNT */}

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
            {filteredLectures.length}
        </strong>{" "}

        lectures

        </div>


        {/* =================================================
            LECTURE TABLE
        ================================================= */}

        <div className="table-wrap">

        <table>

            <thead>

            <tr>

                <th>
                Group
                </th>

                <th>
                Instructor
                </th>

                <th>
                Lecture
                </th>

                <th>
                Date
                </th>

                <th>
                Time
                </th>

                <th>
                Status
                </th>

                <th>
                Meeting
                </th>

                <th>
                </th>

            </tr>

            </thead>

            <tbody>

            {filteredLectures.length ===
            0 ? (

                <tr>

                <td
                    colSpan="8"
                    style={{
                    textAlign:
                        "center",
                    padding: "35px",
                    color:
                        "#6b7280",
                    }}
                >
                    No lectures found
                    matching the selected
                    filters.
                </td>

                </tr>

            ) : (

                filteredLectures.map(
                (lecture) => (

                    <React.Fragment
                    key={lecture.id}
                    >

                    {/* =========================
                        MAIN LECTURE ROW
                    ========================= */}

                    <tr
                        onClick={() =>
                        toggleLecture(
                            lecture.id
                        )
                        }
                        style={{
                        cursor:
                            "pointer",
                        }}
                    >

                        <td>

                        <strong>
                            {
                            lecture
                                .groups
                                ?.name ||
                            "—"
                            }
                        </strong>

                        </td>


                        <td>

                        {
                            lecture
                            .profiles
                            ?.full_name ||
                            "—"
                        }

                        </td>


                        <td>

                        <strong>
                            {
                            lecture.title
                            }
                        </strong>

                        </td>


                        <td>

                        {
                            lecture
                            .lecture_date ||
                            "—"
                        }

                        </td>


                        <td>

                        {
                            lecture
                            .start_time ||
                            "—"
                        }

                        {" - "}

                        {
                            lecture
                            .end_time ||
                            "—"
                        }

                        </td>


                        <td>

                        <span
                            className={`badge ${lecture.status}`}
                        >
                            {
                            lecture.status
                            }
                        </span>

                        </td>


                        <td>

                        {lecture.meeting_link ? (

                            <a
                            href={
                                lecture.meeting_link
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-btn"
                            onClick={(e) =>
                                e.stopPropagation()
                            }
                            >
                            Open
                            </a>

                        ) : (

                            "—"

                        )}

                        </td>


                        {/* ARROW */}

                        <td
                        style={{
                            width:
                            "45px",
                            textAlign:
                            "center",
                        }}
                        >

                        <span
                            style={{
                            display:
                                "inline-block",
                            fontSize:
                                "14px",
                            color:
                                "#6b7280",
                            transition:
                                "0.2s",
                            }}
                        >
                            {expandedLectureId ===
                            lecture.id
                            ? "▲"
                            : "▼"}
                        </span>

                        </td>

                    </tr>


                    {/* =========================
                        EXPANDED REPORT
                    ========================= */}

                    {expandedLectureId ===
                        lecture.id && (

                        <tr>

                        <td
                            colSpan="8"
                            style={{
                            padding: 0,
                            background:
                                "#f8fafc",
                            }}
                        >

                            <div
                            style={{
                                padding:
                                "22px",
                                borderBottom:
                                "1px solid #e5e7eb",
                            }}
                            >

                            {/* REPORT HEADER */}

                            <div
                                style={{
                                display:
                                    "flex",
                                justifyContent:
                                    "space-between",
                                alignItems:
                                    "center",
                                marginBottom:
                                    "16px",
                                }}
                            >

                                <div>

                                <h3
                                    style={{
                                    margin:
                                        0,
                                    fontSize:
                                        "16px",
                                    }}
                                >
                                    Lecture Report
                                </h3>

                                <p
                                    style={{
                                    marginTop:
                                        "5px",
                                    color:
                                        "#6b7280",
                                    fontSize:
                                        "12px",
                                    }}
                                >
                                    {
                                    lecture
                                        .title
                                    }
                                </p>

                                </div>


                                <span
                                className={`badge ${lecture.status}`}
                                >
                                {
                                    lecture.status
                                }
                                </span>

                            </div>


                            {/* DESCRIPTION */}

                            <div
                                style={{
                                background:
                                    "#ffffff",
                                border:
                                    "1px solid #e5e7eb",
                                borderRadius:
                                    "8px",
                                padding:
                                    "16px",
                                }}
                            >

                                <h4
                                style={{
                                    margin:
                                    "0 0 8px",
                                    fontSize:
                                    "13px",
                                    color:
                                    "#374151",
                                }}
                                >
                                Description /
                                Report
                                </h4>


                                {lecture.description ? (

                                <p
                                    style={{
                                    margin:
                                        0,
                                    whiteSpace:
                                        "pre-wrap",
                                    lineHeight:
                                        1.6,
                                    color:
                                        "#4b5563",
                                    fontSize:
                                        "13px",
                                    }}
                                >
                                    {
                                    lecture.description
                                    }
                                </p>

                                ) : (

                                <p
                                    style={{
                                    margin:
                                        0,
                                    color:
                                        "#9ca3af",
                                    fontSize:
                                        "13px",
                                    }}
                                >
                                    No report has
                                    been written
                                    for this
                                    lecture yet.
                                </p>

                                )}

                            </div>

                            {/* MEETING LINK */}

                            {lecture.meeting_link && (

                                <div
                                style={{
                                    marginTop:
                                    "15px",
                                }}
                                >

                                <a
                                    href={
                                    lecture.meeting_link
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn"
                                >
                                    Open meeting
                                </a>

                                </div>

                            )}

                            </div>

                        </td>

                        </tr>

                    )}

                    </React.Fragment>

                )
                )

            )}

            </tbody>

        </table>

        </div>

    </div>

    )}

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


        {/* FILTERS */}

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


        <div
            style={{
            display:
                "flex",
            alignItems:
                "center",
            gap: "7px",
            }}
        >

            <label
            style={{
                fontSize:
                "13px",
                color:
                "#6b7280",
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


        <div
            style={{
            display:
                "flex",
            alignItems:
                "center",
            gap: "7px",
            }}
        >

            <label
            style={{
                fontSize:
                "13px",
                color:
                "#6b7280",
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


        {(studentSearch ||
            fromDate ||
            toDate) && (

            <button
            className="btn secondary"
            onClick={
                clearNoteFilters
            }
            >
            Clear filters
            </button>

        )}

        </div>


        {/* COUNT */}

        <div
        style={{
            padding:
            "0 15px 15px",
            color:
            "#6b7280",
            fontSize:
            "13px",
        }}
        >

        Showing{" "}

        <strong>
            {filteredNotes.length}
        </strong>{" "}

        notes

        </div>


        {/* TABLE */}

        {notesLoading ? (

        <Loading />

        ) : (

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
                    Note
                </th>

                <th>
                    Written by
                </th>

                <th>
                    Date
                </th>

                </tr>

            </thead>

            <tbody>

                {filteredNotes.length ===
                0 ? (

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
                            item
                                .students
                                ?.full_name ||
                            "Unknown student"
                            }
                        </strong>

                        </td>


                        <td>

                        {
                            item
                            .students
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