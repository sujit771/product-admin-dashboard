"use client";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getToken, clearToken } from "@/lib/auth";
import {
  getCategories,
  getProducts,
  searchProducts,
  getProductsByCategory,
  deleteProduct,
} from "@/lib/productsApi";
import Loader from "@/components/Loader";
import ErrorState from "@/components/ErrorState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { applyOverrides, markDeleted } from "@/lib/localOverrides";

// Wrapped in Suspense because useSearchParams needs it in the App Router.
export default function ProductsPageWrapper() {
  return (
    <Suspense fallback={<Loader />}>
      <ProductsPage />
    </Suspense>
  );
}

function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ---- Everything the assignment wants "kept in the URL" lives here ----
  const rawPage = parseInt(searchParams.get("page"), 10);
  const rawSize = parseInt(searchParams.get("size"), 10);
  // Guard against bad values like ?page=abc or ?page=-3 breaking the page.
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const size = [10, 20, 50].includes(rawSize) ? rawSize : 10;
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const sortBy = searchParams.get("sortBy") || "";
  const order = searchParams.get("order") || "asc";

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState(q); // what's actually typed, unthrottled
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debounceTimer = useRef(null);
  const requestId = useRef(0); // increments on every fetch; used to drop stale responses
  const abortController = useRef(null);

  const [authChecked, setAuthChecked] = useState(false);

  // ---------- auth guard ----------
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  // ---------- helper: update the URL (this is what triggers a refetch) ----------
  function updateParams(updates) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value === undefined || value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/products?${params.toString()}`);
  }

  // ---------- load category list once ----------
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  // ---------- the main fetch ----------
  const fetchProducts = useCallback(async () => {
    const myId = ++requestId.current; // this request's "ticket number"
    setLoading(true);
    setError(null);

    // Cancel any request still in flight from a previous keystroke/click.
    if (abortController.current) abortController.current.abort();
    const controller = new AbortController();
    abortController.current = controller;

    const skip = (page - 1) * size;

    try {
      let data;
      if (q) {
        // Searching: the assignment says search and category filter can't
        // be combined against this API, so search wins and category is ignored.
        data = await searchProducts({
          q,
          limit: size,
          skip,
          sortBy,
          order,
          signal: controller.signal,
        });
      } else if (category) {
        data = await getProductsByCategory({
          category,
          limit: size,
          skip,
          sortBy,
          order,
          signal: controller.signal,
        });
      } else {
        data = await getProducts({ limit: size, skip, sortBy, order, signal: controller.signal });
      }

      // If a newer request has started since this one, throw this result away.
      if (myId !== requestId.current) return;

      // Layer local edits/deletes on top of the API's response, and - only
      // on an unfiltered page 1 - show locally-added products too, since
      // the fake API never actually saves them.
      const showLocalAdds = page === 1 && !q && !category;
      const merged = applyOverrides(data.products, {
        includeLocalAdds: showLocalAdds,
      });
      setProducts(merged);
      setTotal(data.total); // local adds/deletes are a small UI-only adjustment, not reflected in the count
    } catch (err) {
      if (err.code === "ERR_CANCELED") return; // we cancelled it on purpose
      if (myId !== requestId.current) return;
      setError("Failed to load products.");
    } finally {
      if (myId === requestId.current) setLoading(false);
    }
  }, [page, size, q, category, sortBy, order]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Guard against a URL like ?page=999 that's past the last real page -
  // once we know the true total, snap back to the last valid page instead
  // of showing a page number that doesn't exist.
  useEffect(() => {
    if (loading || error) return;
    const lastPage = Math.max(1, Math.ceil(total / size));
    if (page > lastPage) {
      updateParams({ page: lastPage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, loading, error]);

  // ---------- search box: debounce before writing to the URL ----------
  function handleSearchChange(e) {
    const value = e.target.value;
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      updateParams({ q: value, page: 1 }); // reset to page 1 on new search
    }, 400);
  }

  // ---------- delete ----------
  async function confirmDelete() {
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteProduct(id);
    } catch {
      // DummyJSON doesn't really persist deletes; we still reflect it locally below.
    }
    markDeleted(id); // remembered so it stays hidden even after a refetch/refresh
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  const totalPages = Math.max(1, Math.ceil(total / size));
  const rangeStart = total === 0 ? 0 : (page - 1) * size + 1;
  const rangeEnd = Math.min(page * size, total);

  // Don't render the protected page at all until we've confirmed there's a
  // token - avoids a flash of product data before the redirect kicks in.
  if (!authChecked) return <Loader />;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Products</h1>
        <div className="flex gap-2">
          <Link
            href="/products/add"
            className="bg-green-600 text-white px-3 py-2 rounded text-sm"
          >
            + Add product
          </Link>
          <button
            onClick={handleLogout}
            className="border px-3 py-2 rounded text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* ---- controls: search, filter, sort, page size ---- */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          placeholder="Search products..."
          className="border rounded px-3 py-2 flex-1 min-w-[180px]"
          value={searchInput}
          onChange={handleSearchChange}
        />

        <select
          className="border rounded px-3 py-2"
          value={category}
          onChange={(e) =>
            updateParams({ category: e.target.value, q: "", page: 1 })
          }
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2"
          value={sortBy}
          onChange={(e) => updateParams({ sortBy: e.target.value, page: 1 })}
        >
          <option value="">Sort by</option>
          <option value="price">Price</option>
          <option value="rating">Rating</option>
          <option value="title">Title</option>
        </select>

        <select
          className="border rounded px-3 py-2"
          value={order}
          onChange={(e) => updateParams({ order: e.target.value, page: 1 })}
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>

        <select
          className="border rounded px-3 py-2"
          value={size}
          onChange={(e) => updateParams({ size: e.target.value, page: 1 })}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      {category && q && (
        <p className="text-xs text-amber-700 mb-2">
          Searching by text takes priority — category filter is ignored while
          a search term is active.
        </p>
      )}

      {/* ---- content ---- */}
      {loading && <Loader />}
      {!loading && error && (
        <ErrorState message={error} onRetry={fetchProducts} />
      )}
      {!loading && !error && products.length === 0 && (
        <p className="text-center py-10 text-gray-500">No products found.</p>
      )}

      {!loading && !error && products.length > 0 && (
        <>
          {/* Desktop table */}
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2"></th>
                <th>Title</th>
                <th>Category</th>
                <th>Price</th>
                <th>Rating</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">
                    <img
                      src={p.thumbnail}
                      alt={p.title}
                      className="w-10 h-10 object-cover rounded"
                    />
                  </td>
                  <td>
                    <Link href={`/products/${p.id}`} className="text-blue-600">
                      {p.title}
                    </Link>
                  </td>
                  <td>{p.category}</td>
                  <td>${p.price}</td>
                  <td>{p.rating}</td>
                  <td>{p.stock}</td>
                  <td className="space-x-2 text-right">
                    <Link
                      href={`/products/${p.id}/edit`}
                      className="text-blue-600"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(p.id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {products.map((p) => (
              <div key={p.id} className="border rounded-lg p-3 flex gap-3">
                <img
                  src={p.thumbnail}
                  alt={p.title}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <Link
                    href={`/products/${p.id}`}
                    className="font-medium text-blue-600"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-gray-500">{p.category}</p>
                  <p className="text-sm">
                    ${p.price} · ⭐{p.rating} · stock {p.stock}
                  </p>
                  <div className="text-sm mt-1 space-x-3">
                    <Link href={`/products/${p.id}/edit`} className="text-blue-600">
                      Edit
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(p.id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ---- pagination ---- */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <p className="text-gray-500">
              Showing {rangeStart}–{rangeEnd} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: page - 1 })}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1">…</span>}
                    <button
                      onClick={() => updateParams({ page: p })}
                      className={`px-3 py-1 border rounded ${
                        p === page ? "bg-blue-600 text-white" : ""
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: page + 1 })}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {deleteTarget !== null && (
        <ConfirmDialog
          message="Delete this product? This can't be undone."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
