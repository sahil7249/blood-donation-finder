import { useCallback, useEffect, useState } from "react";
import { api, BLOOD_GROUPS } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function FindDonors({ toast, go }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ blood_group: "", city: "", status: "" });
  const [cities, setCities] = useState([]);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const search = useCallback(() => {
    setLoading(true); setError("");
    api.donors(filters).then(setDonors).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { api.cities().then(setCities).catch(() => {}); search(); }, []); // eslint-disable-line

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  const contact = (d) => {
    if (!user) {
      toast("Please sign in to contact donors.");
      if (go) go("auth");
      return;
    }
    api.contactDonor(d.id).then((r) => toast(r.detail)).catch((e) => toast(e.message));
  };

  return (
    <section className="active">
      <div className="section-head">
        <div className="eyebrow">Live donor directory</div>
        <h2>Find a donor near you</h2>
        <p>Every donor below has opted in to be contacted. Selecting "Request Contact" notifies them directly — their number is never shown publicly.</p>
      </div>

      <div className="search-bar">
        <select value={filters.blood_group} onChange={set("blood_group")} aria-label="Blood group">
          <option value="">All Blood Groups</option>
          {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={filters.city} onChange={set("city")} aria-label="City">
          <option value="">All Cities</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.status} onChange={set("status")} aria-label="Availability">
          <option value="">Any Availability</option>
          <option value="available">Available now</option>
          <option value="cooldown">On cooldown</option>
        </select>
        <button className="btn btn-primary" onClick={search}>Search</button>
      </div>

      {error && <div className="form-error">{error}</div>}
      <div className="results-count">{loading ? "Searching…" : `${donors.length} donor${donors.length !== 1 ? "s" : ""} found`}</div>

      <div className="donor-grid">
        {!loading && !error && donors.length === 0 && (
          <div className="empty-note" style={{ gridColumn: "1/-1" }}>No donors match these filters yet. Try widening your search.</div>
        )}
        {donors.map((d) => (
          <div className="donor-card" key={d.id}>
            <div className="bgroup">{d.blood_group}</div>
            <div className="name">{d.name}</div>
            <div className="meta">📍 {d.city}</div>
            <div className={`status-${d.status} status-line`}>
              <span className="status-dot"></span>{d.status === "available" ? "Available now" : "On 90-day cooldown"}
            </div>
            <button
              className="contact-btn"
              disabled={d.status !== "available"}
              onClick={() => contact(d)}
              title={!user ? "Sign in to contact this donor" : undefined}
            >
              {user ? "Request Contact" : "Sign in to Contact"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
