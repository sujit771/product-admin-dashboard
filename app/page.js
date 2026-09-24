"use client";
// This is the home page. Its only job is to send the visitor to the
// right place: /products if they're logged in, /login if they're not.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? "/products" : "/login");
  }, [router]);

  return <p className="p-6">Redirecting...</p>;
}
