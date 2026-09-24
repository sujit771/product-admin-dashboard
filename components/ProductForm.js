"use client";
// Shared form for both "Add product" and "Edit product".
// mode: "add" | "edit". initialData is pre-filled when editing.
import { useState } from "react";

export default function ProductForm({ initialData, mode, onSubmit }) {
  const [form, setForm] = useState({
    title: initialData?.title || "",
    category: initialData?.category || "",
    price: initialData?.price ?? "",
    stock: initialData?.stock ?? "",
    description: initialData?.description || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.category.trim()) e.category = "Category is required.";
    if (form.price === "" || Number(form.price) <= 0)
      e.price = "Price must be a positive number.";
    if (form.stock === "" || Number(form.stock) < 0)
      e.stock = "Stock can't be negative.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    if (saving) return; // prevents double submit on fast double-clicks
    if (!validate()) return;

    setSaving(true);
    try {
      await onSubmit({
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
      });
    } finally {
      setSaving(false);
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="block text-sm mb-1">Title</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />
        {errors.title && <p className="text-red-600 text-sm">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm mb-1">Category</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
        />
        {errors.category && (
          <p className="text-red-600 text-sm">{errors.category}</p>
        )}
      </div>

      <div>
        <label className="block text-sm mb-1">Price</label>
        <input
          type="number"
          step="0.01"
          className="w-full border rounded px-3 py-2"
          value={form.price}
          onChange={(e) => update("price", e.target.value)}
        />
        {errors.price && <p className="text-red-600 text-sm">{errors.price}</p>}
      </div>

      <div>
        <label className="block text-sm mb-1">Stock</label>
        <input
          type="number"
          className="w-full border rounded px-3 py-2"
          value={form.stock}
          onChange={(e) => update("stock", e.target.value)}
        />
        {errors.stock && <p className="text-red-600 text-sm">{errors.stock}</p>}
      </div>

      <div>
        <label className="block text-sm mb-1">Description</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          rows={4}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {saving ? "Saving..." : mode === "add" ? "Add product" : "Save changes"}
      </button>
    </form>
  );
}
