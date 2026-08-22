import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  listStock,
  createStockItem,
  updateStockItem,
  deleteStockItem,
} from "../services/stockService";

import Loading from "../components/Loading";


const blankStock = {
  name: "",
  category: "",
  sku: "",
  quantity: 0,
  minimum_quantity: 0,
};

export default function Stock() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState(blankStock);

  useEffect(() => {
    fetchStock();
  }, []);

  async function fetchStock() {
    try {
      setLoading(true);
      setError("");

      const data = await listStock();

      setStock(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load stock");
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingItem(null);
    setForm(blankStock);
    setShowModal(true);
  }

  function openEditModal(item) {
    setEditingItem(item);

    setForm({
      name: item.name || "",
      category: item.category || "",
      sku: item.sku || "",
      quantity: item.quantity ?? 0,
      minimum_quantity: item.minimum_quantity ?? 0,
    });

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingItem(null);
    setForm(blankStock);
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter the item name.");
      return;
    }

    if (!form.category.trim()) {
      alert("Please enter the category.");
      return;
    }

    if (!form.sku.trim()) {
      alert("Please enter the SKU.");
      return;
    }

    try {
      setSaving(true);

      if (editingItem) {
        const updated = await updateStockItem(
          editingItem.id,
          form
        );

        setStock((prev) =>
          prev.map((item) =>
            item.id === updated.id ? updated : item
          )
        );
      } else {
        const created = await createStockItem(form);

        setStock((prev) => [created, ...prev]);
      }

      closeModal();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save stock item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) return;

    try {
      await deleteStockItem(item.id);

      setStock((prev) =>
        prev.filter((stockItem) => stockItem.id !== item.id)
      );
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete stock item.");
    }
  }

  const filteredStock = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return stock;

    return stock.filter((item) =>
      [
        item.name,
        item.category,
        item.sku,
      ].some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(value)
      )
    );
  }, [stock, search]);

  const lowStockCount = stock.filter(
    (item) => Number(item.quantity) <= Number(item.minimum_quantity)
  ).length;

  if (loading) {
    return <Loading text="Loading stock" />;
  }

  return (
    <div className="stock-page">

      {/* Header */}
      <div className="stock-header">
        <div>
          <h2>Stock</h2>
          <p>Manage electronic parts and inventory</p>
        </div>

        <button
          className="add-stock-button"
          onClick={openAddModal}
        >
          + Add Part
        </button>
      </div>

      {/* Statistics */}
      <div className="stock-stats">

        <div className="stock-stat-card">
          <span>Total Items</span>
          <strong>{stock.length}</strong>
        </div>

        <div className="stock-stat-card">
          <span>Total Quantity</span>
          <strong>
            {stock.reduce(
              (total, item) =>
                total + Number(item.quantity || 0),
              0
            )}
          </strong>
        </div>

        <div className="stock-stat-card low-stock">
          <span>Low Stock</span>
          <strong>{lowStockCount}</strong>
        </div>

      </div>

      {/* Search */}
      <div className="stock-toolbar">
        <input
          type="text"
          placeholder="Search by name, category or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button onClick={fetchStock}>
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="stock-error">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="stock-table-container">

        <table className="stock-table">

          <thead>
            <tr>
              <th>Part</th>
              <th>Category</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Minimum</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {filteredStock.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="empty-stock"
                >
                  No stock items found.
                </td>
              </tr>
            ) : (
              filteredStock.map((item) => {

                const quantity = Number(item.quantity || 0);
                const minimum = Number(
                  item.minimum_quantity || 0
                );

                const isLowStock = quantity <= minimum;

                return (
                  <tr key={item.id}>

                    <td>
                      <div className="part-name">
                        {item.name}
                      </div>
                    </td>

                    <td>
                      {item.category}
                    </td>

                    <td>
                      <span className="sku">
                        {item.sku}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {quantity}
                      </strong>
                    </td>

                    <td>
                      {minimum}
                    </td>

                    <td>
                      {isLowStock ? (
                        <span className="stock-status low">
                          Low Stock
                        </span>
                      ) : (
                        <span className="stock-status available">
                          Available
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="stock-actions">

                        <button
                          onClick={() =>
                            openEditModal(item)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="delete"
                          onClick={() =>
                            handleDelete(item)
                          }
                        >
                          Delete
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })
            )}

          </tbody>

        </table>

      </div>

{showModal &&
  createPortal(
    <div className="stock-modal-overlay">
      <div className="stock-modal">

        <div className="stock-modal-header">
          <div>
            <h3>
              {editingItem
                ? "Edit Stock Item"
                : "Add Stock Item"}
            </h3>

            <p>
              Enter the electronic part details
            </p>
          </div>

          <button
            className="close-button"
            onClick={closeModal}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Part Name</label>

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Arduino Uno"
            />
          </div>

          <div className="form-row">

            <div className="form-group">
              <label>Category</label>

              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g. Microcontrollers"
              />
            </div>

            <div className="form-group">
              <label>SKU</label>

              <input
                name="sku"
                value={form.sku}
                onChange={handleChange}
                placeholder="e.g. ARD-UNO-001"
              />
            </div>

          </div>

          <div className="form-row">

            <div className="form-group">
              <label>Quantity</label>

              <input
                type="number"
                min="0"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Minimum Quantity</label>

              <input
                type="number"
                min="0"
                name="minimum_quantity"
                value={form.minimum_quantity}
                onChange={handleChange}
              />
            </div>

          </div>

          <div className="modal-actions">

            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingItem
                ? "Update Part"
                : "Add Part"}
            </button>

          </div>

        </form>

      </div>
    </div>,
    document.body
  )}

    </div>
  );
}