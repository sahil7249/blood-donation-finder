import { useCallback, useRef, useState } from "react";
import { Routes, Route, NavLink, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import Home from "./components/Home.jsx";
import FindDonors from "./components/FindDonors.jsx";
import BecomeDonor from "./components/BecomeDonor.jsx";
import BloodBankPortal from "./components/BloodBankPortal.jsx";
import Emergency from "./components/Emergency.jsx";
import Auth from "./components/Auth.jsx";
import Chatbot from "./components/Chatbot.jsx";
import { useAuth } from "./auth.jsx";

const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/find-donors", label: "Find Donors" },
  { path: "/become-donor", label: "Become a Donor" },
  { path: "/blood-banks", label: "Blood Bank Portal" },
  { path: "/emergency", label: "Emergency Requests", emergency: true },
];

const ROUTE_ALIASES = {
  home: "/",
  search: "/find-donors",
  "find-donors": "/find-donors",
  "donor-register": "/become-donor",
  "become-donor": "/become-donor",
  bank: "/blood-banks",
  "blood-banks": "/blood-banks",
  emergency: "/emergency",
  auth: "/auth",
};

function NotFound({ go }) {
  return (
    <section className="active">
      <div className="not-found-wrap">
        <div className="not-found-card">
          <div className="eyebrow">404 · Page Not Found</div>
          <h2>Page Not Found</h2>
          <p>
            The page you are looking for doesn't exist or has moved. Return to the home page or search for blood donors.
          </p>
          <div className="not-found-actions">
            <button className="btn btn-primary" onClick={() => go("/")}>Back to Home</button>
            <button className="btn btn-outline" onClick={() => go("/find-donors")}>Find Donors</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [toastMsg, setToastMsg] = useState("");
  const timer = useRef();

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(""), 3000);
  }, []);

  const go = useCallback((target) => {
    const dest = ROUTE_ALIASES[target] || target;
    const isAuth = dest === "/auth" || target === "auth";
    navigate(dest, isAuth ? { state: { from: location.pathname } } : undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [navigate, location.pathname]);

  return (
    <>
      <nav>
        <Link to="/" className="logo">
          <svg className="logo-mark" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C12 2 4.5 11.2 4.5 16.2C4.5 20.2 7.9 22.8 12 22.8C16.1 22.8 19.5 20.2 19.5 16.2C19.5 11.2 12 2 12 2Z" fill="#C81E3A" />
          </svg>
          LifeLink
        </Link>
        <div className="navlinks">
          {NAV_ITEMS.map(({ path, label, emergency }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `${isActive ? "active" : ""} ${emergency ? "emergency-btn" : ""}`.trim()
              }
            >
              {label}
            </NavLink>
          ))}
          {user ? (
            <>
              <span className="nav-user">{user.name}</span>
              <button
                className="signin"
                onClick={() => {
                  signOut();
                  toast("You've been signed out.");
                  go("/");
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <NavLink
              to="/auth"
              state={{ from: location.pathname }}
              className={({ isActive }) => `signin ${isActive ? "active" : ""}`}
            >
              Sign in
            </NavLink>
          )}
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Home go={go} />} />
          <Route path="/find-donors" element={<FindDonors toast={toast} go={go} />} />
          <Route path="/become-donor" element={<BecomeDonor toast={toast} go={go} />} />
          <Route path="/blood-banks" element={<BloodBankPortal toast={toast} go={go} />} />
          <Route path="/emergency" element={<Emergency toast={toast} go={go} />} />
          <Route
            path="/auth"
            element={
              <Auth
                toast={toast}
                onDone={() => {
                  const dest = location.state?.from && location.state.from !== "/auth"
                    ? location.state.from
                    : "/";
                  navigate(dest, { replace: true });
                }}
              />
            }
          />

          {/* Legacy route redirects */}
          <Route path="/search" element={<Navigate to="/find-donors" replace />} />
          <Route path="/donor-register" element={<Navigate to="/become-donor" replace />} />
          <Route path="/bank" element={<Navigate to="/blood-banks" replace />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signin" element={<Navigate to="/auth" replace />} />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound go={go} />} />
        </Routes>
      </main>

      <footer>LifeLink — a CEP prototype connecting donors, hospitals and blood banks · Built for demonstration purposes</footer>

      <div className={`toast ${toastMsg ? "show" : ""}`} role="status">
        <span className="dot"></span>
        <span>{toastMsg}</span>
      </div>

      <Chatbot />
    </>
  );
}

