// DummyJSON's add/edit/delete endpoints respond as if they worked, but
// don't actually persist anything server-side. This file keeps a small
// local record (in the browser's localStorage) of edits/deletes/adds so
// the UI can reflect changes even though the fake API "forgets" them.

const KEY = "productOverrides";

function readStore() {
  if (typeof window === "undefined") return { edits: {}, deletes: [], adds: [] };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { edits: {}, deletes: [], adds: [] };
  } catch {
    return { edits: {}, deletes: [], adds: [] };
  }
}

function writeStore(store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function saveEdit(id, data) {
  const store = readStore();
  store.edits[id] = { ...(store.edits[id] || {}), ...data };
  const localAddIndex = store.adds.findIndex((p) => p.id === id);
  if (localAddIndex !== -1) {
    store.adds[localAddIndex] = { ...store.adds[localAddIndex], ...data };
  }
  writeStore(store);
}

export function markDeleted(id) {
  const store = readStore();
  if (!store.deletes.includes(id)) store.deletes.push(id);
  delete store.edits[id];
  store.adds = store.adds.filter((p) => p.id !== id);
  writeStore(store);
}

export function addLocalProduct(product) {
  const store = readStore();
  const id = `local-${Date.now()}`;
  const withId = {
    id,
    thumbnail: "https://placehold.co/100x100?text=New",
    images: ["https://placehold.co/400x400?text=New+Product"],
    rating: 0,
    reviews: [],
    ...product,
  };
  store.adds.unshift(withId);
  writeStore(store);
  return withId;
}

// Applies edits/deletes to a page of API results, and (only when it's
// safe to do so - page 1, no search/filter) prepends locally-added items.
export function applyOverrides(products, { includeLocalAdds = false } = {}) {
  const store = readStore();
  const filtered = products.filter((p) => !store.deletes.includes(p.id));
  const withEdits = filtered.map((p) =>
    store.edits[p.id] ? { ...p, ...store.edits[p.id] } : p
  );
  if (includeLocalAdds && store.adds.length) {
    return [...store.adds, ...withEdits];
  }
  return withEdits;
}

export function getLocalAddsCount() {
  return readStore().adds.length;
}

export function findLocalProduct(id) {
  const store = readStore();
  return store.adds.find((p) => p.id === id) || null;
}

export function getEditFor(id) {
  return readStore().edits[id] || null;
}
