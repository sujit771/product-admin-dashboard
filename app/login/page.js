"use client";
// Login page. Only job: send username/password to POST /auth/login,
// store the token we get back, and send the user to /products.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/authApi";
import { saveToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // used to disable the button

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return; // stops double-clicks from firing two requests
    setError("");
    setLoading(true);

    try {
      const data = await login(username, password);
      saveToken(data.accessToken);
      router.push("/products");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError("Invalid username or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-lg shadow"
      >
        <h1 className="text-xl font-bold mb-4">Log in</h1>

        {error && (
          <p className="bg-red-100 text-red-700 text-sm p-2 rounded mb-3">
            {error}
          </p>
        )}

        <label className="block text-sm mb-1">Username</label>
        <input
          className="w-full border rounded px-3 py-2 mb-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="emilys"
          required
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="emilyspass"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
