"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProduct } from "@/lib/productsApi";
import { getToken } from "@/lib/auth";
import Loader from "@/components/Loader";
import { getEditFor, findLocalProduct } from "@/lib/localOverrides";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    // A locally-added product only exists in localStorage, not the real API.
    const localProduct = findLocalProduct(id);
    if (localProduct) {
      setProduct(localProduct);
      setLoading(false);
      return;
    }

    getProduct(id)
      .then((data) => {
        const existingEdit = getEditFor(id);
        setProduct(existingEdit ? { ...data, ...existingEdit } : data);
      })
      .catch(() => {
        // Any failure to load this specific product (404, bad id format,
        // etc.) is shown as "not found" rather than leaving a blank page.
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader />;
  if (!authChecked) return <Loader />;

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-xl font-bold mb-2">Product not found</h1>
        <Link href="/products" className="text-blue-600">
          Back to products
        </Link>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Link href="/products" className="text-blue-600 text-sm">
        ← Back
      </Link>

      <div className="grid md:grid-cols-2 gap-6 mt-3">
        <div>
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full rounded-lg mb-2"
          />
          <div className="flex gap-2 overflow-x-auto">
            {product.images?.map((img, i) => (
              <img key={i} src={img} className="w-16 h-16 object-cover rounded" />
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <p className="text-gray-500">{product.category}</p>
          <p className="text-xl mt-2">${product.price}</p>
          <p className="text-sm mt-1">
            ⭐ {product.rating} · Stock: {product.stock}
          </p>
          <p className="mt-4">{product.description}</p>

          <h2 className="font-semibold mt-6 mb-2">Reviews</h2>
          {product.reviews?.length ? (
            <div className="space-y-2">
              {product.reviews.map((r, i) => (
                <div key={i} className="border rounded p-2 text-sm">
                  <p className="font-medium">
                    {r.reviewerName} · ⭐{r.rating}
                  </p>
                  <p>{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No reviews yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
