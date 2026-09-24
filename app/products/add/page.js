"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addProduct } from "@/lib/productsApi";
import { getToken } from "@/lib/auth";
import ProductForm from "@/components/ProductForm";
import Loader from "@/components/Loader";
import { addLocalProduct } from "@/lib/localOverrides";

export default function AddProductPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  async function handleSubmit(data) {
    // DummyJSON's /products/add responds successfully but doesn't actually
    // save anything server-side, so we also keep it locally - that's what
    // makes the new product actually show up on the list afterwards.
    await addProduct(data);
    addLocalProduct(data);
    router.push("/products");
  }

  if (!authChecked) return <Loader />;

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Add product</h1>
      <ProductForm mode="add" onSubmit={handleSubmit} />
    </div>
  );
}
