"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProduct, updateProduct } from "@/lib/productsApi";
import { getToken } from "@/lib/auth";
import ProductForm from "@/components/ProductForm";
import Loader from "@/components/Loader";
import { saveEdit, getEditFor, findLocalProduct } from "@/lib/localOverrides";

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  useEffect(() => {
    // A locally-added product doesn't exist in the real API at all.
    const localProduct = findLocalProduct(id);
    if (localProduct) {
      setProduct(localProduct);
      setLoading(false);
      return;
    }

    getProduct(id)
      .then((data) => {
        // Show any edit we've already applied locally, so re-editing
        // starts from the latest values instead of the fake API's stale ones.
        const existingEdit = getEditFor(id);
        setProduct(existingEdit ? { ...data, ...existingEdit } : data);
      })
      .catch(() => {
        // Leaves `product` as null - handled below with "Product not found."
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data) {
    const isLocalOnly = String(id).startsWith("local-");
    if (!isLocalOnly) {
      // DummyJSON's PUT doesn't persist server-side, so we also save the
      // change locally - that's what makes it show up back on the list.
      await updateProduct(id, data);
    }
    saveEdit(id, data);
    router.push("/products");
  }

  if (loading) return <Loader />;
  if (!authChecked) return <Loader />;
  if (!product) return <p className="p-6">Product not found.</p>;

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Edit product</h1>
      <ProductForm mode="edit" initialData={product} onSubmit={handleSubmit} />
    </div>
  );
}
