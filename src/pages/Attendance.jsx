import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { listGroups } from "../services/groupService";
import {
listLectures,
listAttendanceForLecture,
saveAttendance,
} from "../services/lectureService";
import { listStudents } from "../services/studentService";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
export default function Attendance() {
const { profile } = useAuth();
const [groups, setGroups] = useState([]),
[lectures, setLectures] = useState([]),
[students, setStudents] = useState([]),
[selectedGroup, setSelectedGroup] = useState(""),
[selectedLecture, setSelectedLecture] = useState(""),
[status, setStatus] = useState({}),
[loading, setLoading] = useState(true),
[error, setError] = useState(""),
[lectureAttendance, setLectureAttendance] = useState({}),
[expandedLecture, setExpandedLecture] = useState(null),
[attendanceLoading, setAttendanceLoading] = useState(false);

async function loadAdminAttendance() {
try {
    setAttendanceLoading(true);
    setError("");

    const result = {};

    for (const lecture of groupLectures) {
    const rows = await listAttendanceForLecture(lecture.id);

    result[lecture.id] = rows || [];
    }

    setLectureAttendance(result);
} catch (e) {
    console.error("Error loading admin attendance:", e);
    setError(e.message);
} finally {
    setAttendanceLoading(false);
}
}
async function load() {
try {
    setLoading(true);
    setError("");
    const gs = await listGroups();
    setGroups(gs);
    const ids = gs.map((g) => g.id);
    const [ls, ss] = await Promise.all([
    listLectures(ids),
    listStudents(ids),
    ]);
    setLectures(ls);
    setStudents(ss);
    setSelectedGroup(gs[0] ? String(gs[0].id) : "");
} catch (e) {
    setError(e.message);
} finally {
    setLoading(false);
}
}
useEffect(() => {
load();
}, [profile?.id]);
const groupStudents = students.filter(
(s) => String(s.group_id) === selectedGroup,
);
const groupLectures = lectures.filter(
(l) => String(l.group_id) === selectedGroup,
);
useEffect(() => {
setSelectedLecture(groupLectures[0] ? String(groupLectures[0].id) : "");
}, [selectedGroup, lectures.length]);
useEffect(() => {
async function fetchAttendance() {
    if (!selectedLecture) return;
    try {
    const rows = await listAttendanceForLecture(Number(selectedLecture));
    setStatus(
        Object.fromEntries(rows.map((r) => [r.student_id, r.status])),
    );
    } catch (e) {
    setError(e.message);
    }
}
fetchAttendance();
}, [selectedLecture]);
useEffect(() => {
if (profile?.role !== "admin") {
    return;
}

if (!selectedGroup) {
    setLectureAttendance({});
    return;
}

if (!groupLectures.length) {
    setLectureAttendance({});
    return;
}
loadAdminAttendance();
}, [selectedGroup, lectures, profile?.role]);
function getAttendanceStats(lectureId) {
const rows = lectureAttendance[lectureId] || [];

return {
    present: rows.filter((r) => r.status === "present").length,

    late: rows.filter((r) => r.status === "late").length,

    absent: rows.filter((r) => r.status === "absent").length,

    total: rows.length,
};
}
async function submit() {
try {
    await saveAttendance(
    groupStudents.map((s) => ({
        lecture_id: Number(selectedLecture),
        student_id: s.id,
        status: status[s.id] || "absent",
    })),
    );
    alert("Attendance saved.");
} catch (e) {
    setError(e.message);
}
}
if (loading) return <Loading />;
if (error) return <ErrorState message={error} onRetry={load} />;
return (
<div>
    <div className="page-heading">
    <div>
        <h1>Attendance</h1>
        <p>
        {profile?.role === "admin"
            ? "View and edit attendance for every group."
            : "Take and update attendance for your groups."}
        </p>
    </div>
    </div>
    <div className="toolbar">
    <select
        value={selectedGroup}
        onChange={(e) => setSelectedGroup(e.target.value)}
    >
        <option value="">Select group</option>
        {groups.map((g) => (
        <option value={g.id} key={g.id}>
            {g.name}
        </option>
        ))}
    </select>
    <select
        value={selectedLecture}
        onChange={(e) => setSelectedLecture(e.target.value)}
    >
        <option value="">Select lecture</option>
        {groupLectures.map((l) => (
        <option value={l.id} key={l.id}>
            {l.lecture_date} · {l.title}
        </option>
        ))}
    </select>
    <button
        className="btn secondary"
        onClick={() =>
        setStatus(
            Object.fromEntries(groupStudents.map((s) => [s.id, "present"])),
        )
        }
    >
        Mark all present
    </button>
    <button className="btn" onClick={submit} disabled={!selectedLecture}>
        Save attendance
    </button>
    </div>
    {profile?.role === 'admin' ? (

    /* =====================================================
        ADMIN ATTENDANCE VIEW
    ===================================================== */

    <div className="panel">

        {attendanceLoading ? (

        <Loading />

        ) : groupLectures.length === 0 ? (

        <div
            style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6b7280',
            }}
        >
            No lectures found for this group.
        </div>

        ) : (

        <div
            style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            }}
        >

            {groupLectures.map((lecture) => {

            const stats =
                getAttendanceStats(lecture.id);

            const rows =
                lectureAttendance[lecture.id] || [];

            const isExpanded =
                expandedLecture === lecture.id;

            return (

                <div
                key={lecture.id}
                style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: '#fff',
                }}
                >

                {/* =====================================
                    LECTURE HEADER
                ===================================== */}

                <div
                    style={{
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px',
                    cursor: 'pointer',
                    }}
                    onClick={() =>
                    setExpandedLecture(
                        isExpanded
                        ? null
                        : lecture.id
                    )
                    }
                >

                    <div>

                    <h3
                        style={{
                        margin: 0,
                        fontSize: '16px',
                        }}
                    >
                        {lecture.title}
                    </h3>

                    <div
                        style={{
                        marginTop: '5px',
                        color: '#6b7280',
                        fontSize: '13px',
                        }}
                    >
                        {lecture.lecture_date}

                        {lecture.start_time
                        ? ` · ${lecture.start_time}`
                        : ''}
                    </div>

                    </div>

                    <button
                    type="button"
                    className="btn secondary"
                    onClick={(e) => {
                        e.stopPropagation();

                        setExpandedLecture(
                        isExpanded
                            ? null
                            : lecture.id
                        );
                    }}
                    >
                    {isExpanded
                        ? 'Hide students'
                        : 'View students'}
                    </button>

                </div>


                {/* =====================================
                    ATTENDANCE STATISTICS
                ===================================== */}

                <div
                    style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '0 16px 16px',
                    }}
                >

                    <span className="badge present">
                    Present: {stats.present}
                    </span>

                    <span className="badge late">
                    Late: {stats.late}
                    </span>

                    <span className="badge absent">
                    Absent: {stats.absent}
                    </span>

                    <span className="badge">
                    Recorded: {stats.total}
                    </span>

                </div>


                {/* =====================================
                    STUDENTS
                ===================================== */}

                {isExpanded && (

                    <div
                    style={{
                        borderTop:
                        '1px solid #e5e7eb',
                    }}
                    >

                    {rows.length === 0 ? (

                        <div
                        style={{
                            padding: '30px',
                            textAlign: 'center',
                            color: '#6b7280',
                        }}
                        >
                        No attendance has been
                        recorded for this lecture.
                        </div>

                    ) : (

                        <div className="table-wrap">

                        <table>

                            <thead>

                            <tr>
                                <th>Student</th>
                                <th>Status</th>
                            </tr>

                            </thead>

                            <tbody>

                            {rows.map((row) => (

                                <tr
                                key={`${lecture.id}-${row.student_id}`}
                                >

                                <td>

                                    {row.students?.full_name ||
                                    'Unknown student'}

                                </td>

                                <td>

                                    <span
                                    className={`badge ${row.status}`}
                                    >
                                    {row.status}
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
            })}

        </div>

        )}

    </div>

    ) : (

    /* =====================================================
        INSTRUCTOR ATTENDANCE VIEW
    ===================================================== */

    <div className="panel">

        <div className="table-wrap">

        <table>

            <thead>

            <tr>
                <th>Student</th>
                <th>Status</th>
            </tr>

            </thead>

            <tbody>

            {groupStudents.map((s) => (

                <tr key={s.id}>

                <td>
                    {s.full_name}
                </td>

                <td>

                    <select
                    value={
                        status[s.id] ||
                        'absent'
                    }
                    onChange={(e) =>
                        setStatus({
                        ...status,
                        [s.id]:
                            e.target.value,
                        })
                    }
                    >

                    <option value="present">
                        Present
                    </option>

                    <option value="late">
                        Late
                    </option>

                    <option value="absent">
                        Absent
                    </option>

                    </select>

                </td>

                </tr>

            ))}

            </tbody>

        </table>

        </div>

    </div>

    )}
    {/* <div className="panel">
    <div className="table-wrap">
        <table>
        <thead>
            <tr>
            <th>Student</th>
            <th>Status</th>
            </tr>
        </thead>
        <tbody>
            {groupStudents.map((s) => (
            <tr key={s.id}>
                <td>{s.full_name}</td>
                <td>
                <select
                    value={status[s.id] || "absent"}
                    onChange={(e) =>
                    setStatus({ ...status, [s.id]: e.target.value })
                    }
                >
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                </select>
                </td>
            </tr>
            ))}
        </tbody>
        </table>
    </div>
    </div> */}
</div>
);
}
