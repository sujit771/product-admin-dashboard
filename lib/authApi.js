// Auth-related API calls, kept out of the login component.
import api from "./axios";

export function login(username, password) {
  return api
    .post("/auth/login", { username, password, expiresInMins: 60 })
    .then((res) => res.data);
}
