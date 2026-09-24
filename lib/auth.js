// Small helper functions around storing the login token in the browser.
// We use localStorage because this is a simple client-only app.

export function saveToken(token) {
  localStorage.setItem("token", token);
}

export function getToken() {
  if (typeof window === "undefined") return null; // guards against server-side calls
  return localStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem("token");
}
