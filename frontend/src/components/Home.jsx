import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";


const icon = (d) => <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><path d={d} /></svg>;

const FEATURES = [
  ["Search verified donors", "Filter by blood group, city, and availability. Contact requests go through the platform, so phone numbers stay private until a donor accepts.",
    "M12 21s-7-4.35-9.5-9.1C.8 8.1 2.7 4.5 6.2 4.5c2 0 3.4 1.1 4.3 2.4 1-1.3 2.3-2.4 4.3-2.4 3.5 0 5.4 3.6 3.7 7.4C19 16.65 12 21 12 21z"],
  ["Blood banks publish live stock", "Every connected blood bank updates its unit inventory per blood group, so hospitals and donors see accurate, current availability — not guesswork.",
    "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"],
  ["Emergency broadcast", "A critical request fans out instantly to nearby matching donors and every connected blood bank in the city, ranked by urgency.",
    "M12 9v4m0 4h.01M10.3 3.86l-8.2 14.2A1.5 1.5 0 003.5 20.4h17a1.5 1.5 0 001.4-2.34l-8.2-14.2a1.5 1.5 0 00-2.6 0z"],
];

const STEPS = [
  ["Register & verify", "Blood bank submits license ID and address; LifeLink verifies it against government registries."],
  ["Publish inventory", "Bank updates unit counts per blood group from its portal — daily or in real time via its own system."],
  ["Receive requests", "Matching donor contacts and hospital requests route straight into the bank's dashboard."],
  ["Fulfil & update", "Bank confirms the unit dispatched; stock and donor cooldown status update automatically."],
];

export default function Home({ go }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  return (
    <section className="active">
      <div className="hero">
        <div>
          <div className="eyebrow">● Connecting donors, blood banks & patients in real time</div>
          <h1>Every drop finds<br />its way, <em>faster.</em></h1>
          <p className="lead">LifeLink is a single network where verified blood banks publish live stock, donors stay reachable, and hospitals raise emergency requests — closing the gap between need and supply.</p>
          <div className="hero-ctas">
            <Link to="/find-donors" className="btn btn-primary">Find a Donor</Link>
            <Link to="/blood-banks?tab=register" className="btn btn-outline">Register Your Blood Bank</Link>
          </div>
        </div>
        <div className="pulse-card">
          <svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
            <polyline className="pulse-line" points="0,60 50,60 65,20 85,100 105,60 320,60" />
          </svg>
          <div className="pulse-stats">
            <div className="pulse-stat"><div className="num">{stats ? `${stats.donors}+` : "—"}</div><div className="label">Registered Donors</div></div>
            <div className="pulse-stat"><div className="num">{stats ? stats.banks : "—"}</div><div className="label">Connected Blood Banks</div></div>
            <div className="pulse-stat"><div className="num">312</div><div className="label">Lives Matched / Month</div></div>
            <div className="pulse-stat"><div className="num">4.2 min</div><div className="label">Avg. Response Time</div></div>
          </div>
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 20 }}>
        <div className="eyebrow">What the platform does</div>
        <h2>One network, three roles</h2>
        <p>Donors, blood banks, and hospitals each get a purpose-built view into the same live data.</p>
      </div>
      <div className="features">
        {FEATURES.map(([title, text, path]) => (
          <div className="feature" key={title}>
            <div className="icon">{icon(path)}</div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <div className="flow">
        <h3>How a blood bank connects</h3>
        <div className="flow-steps">
          {STEPS.map(([title, text], i) => (
            <div className="flow-step" key={title}>
              <div className="flow-num">{String(i + 1).padStart(2, "0")}</div>
              <h4>{title}</h4><p>{text}</p>
              {i < STEPS.length - 1 && <div className="flow-arrow">→</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
