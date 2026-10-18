import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());

  // Restore the session from a saved token when the page loads.
  useEffect(() => {
    if (!getToken()) return;
    api.me().then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const finish = ({ token, user }) => { setToken(token); setUser(user); return user; };
  const value = {
    user,
    signIn: (email, password) => api.login({ email, password }).then(finish),
    signUp: (name, email, password) => api.signup({ name, email, password }).then(finish),
    signOut: () => { api.logout().catch(() => {}); setToken(null); setUser(null); },
  };
  return <AuthContext.Provider value={value}>{ready ? children : null}</AuthContext.Provider>;
}
