// All product-related API calls live here, separate from the UI components.
// Every page imports functions from this file instead of calling `api`
// directly - this is what the assignment means by "put API calls in
// separate files, not inside the UI code."
import api from "./axios";

export function getCategories() {
  return api.get("/products/categories").then((res) =>
    res.data.map((c) => (typeof c === "string" ? c : c.slug))
  );
}

export function getProducts({ limit, skip, sortBy, order, signal }) {
  return api
    .get("/products", {
      params: { limit, skip, sortBy: sortBy || undefined, order },
      signal,
    })
    .then((res) => res.data);
}

export function searchProducts({ q, limit, skip, sortBy, order, signal }) {
  return api
    .get("/products/search", {
      params: { q, limit, skip, sortBy: sortBy || undefined, order },
      signal,
    })
    .then((res) => res.data);
}

export function getProductsByCategory({ category, limit, skip, sortBy, order, signal }) {
  return api
    .get(`/products/category/${category}`, {
      params: { limit, skip, sortBy: sortBy || undefined, order },
      signal,
    })
    .then((res) => res.data);
}

export function getProduct(id) {
  return api.get(`/products/${id}`).then((res) => res.data);
}

export function addProduct(data) {
  return api.post("/products/add", data).then((res) => res.data);
}

export function updateProduct(id, data) {
  return api.put(`/products/${id}`, data).then((res) => res.data);
}

export function deleteProduct(id) {
  return api.delete(`/products/${id}`).then((res) => res.data);
}
