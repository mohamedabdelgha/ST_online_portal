import { useEffect, useState } from "react";
import { listProfiles, updateProfile } from "../services/authService";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import Modal from "../components/Modal";
export default function Users() {
  const [users, setUsers] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState({
      full_name: "",
      email: "",
      phone: "",
      role: "instructor",
    });
  async function load() {
    try {
      setLoading(true);
      setError("");
      setUsers(await listProfiles());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function startEdit(u) {
    setEditing(u);
    setForm({
      full_name: u.full_name || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role,
    });
    setOpen(true);
  }
  async function submit(e) {
    e.preventDefault();
    try {
      await updateProfile(editing.id, {
        full_name: form.full_name,
        phone: form.phone,
        role: form.role,
      });
      setOpen(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  if (loading) return <Loading />;
  if (error && !open) return <ErrorState message={error} onRetry={load} />;
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Users</h1>
          <p>
            Admins can edit every user's profile and role.
          </p>
        </div>
      </div>
      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.phone || "—"}</td>
                  <td>
                    <span className="badge">{u.role}</span>
                  </td>
                  <td>
                    <button className="text-btn" onClick={() => startEdit(u)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {open && (
        <Modal title="Edit user" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="form-grid">
            <label>
              Full name
              <input
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                required
              />
            </label>
            <label>
              Email
              <input value={form.email} disabled />
            </label>
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              Role
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button className="btn">Save changes</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
