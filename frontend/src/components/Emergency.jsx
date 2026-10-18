import { useEffect, useState } from "react";
import { api, BLOOD_GROUPS } from "../api.js";
import { useAuth } from "../auth.jsx";
import SignInPrompt from "./SignInPrompt.jsx";

const EMPTY = { blood_group: "", units: "", hospital: "", urgency: "" };

export default function Emergency({ toast, go }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const load = () => {
    if (!user) return;
    api.requests().then(setRequests).catch((e) => setError(e.message));
  };
  useEffect(() => { load(); }, [user]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault(); setError("");
    try {
      await api.raiseRequest({ ...form, units: Number(form.units) });
      toast(`Request broadcast to matching ${form.blood_group} donors and nearby blood banks.`);
      setForm(EMPTY); setShowForm(false); load();
    } catch (err) { setError(err.message); }
  };

  const help = (id) => api.respondToRequest(id).then((r) => toast(r.detail)).catch((e) => toast(e.message));

  if (!user) {
    return (
      <section className="active">
        <div className="req-banner">
          <div>
            <h3>Emergency blood requests</h3>
            <p>Critical requests are broadcast to every matching donor and connected blood bank in the request's city within seconds.</p>
          </div>
        </div>
        <SignInPrompt
          go={go}
          title="Sign in to access emergency requests"
          text="Emergency requests contain urgent hospital patient information. Sign in or create an account to view open emergencies, broadcast critical needs, or respond to save a life."
        />
      </section>
    );
  }

  return (
    <section className="active">
      <div className="req-banner">
        <div>
          <h3>Emergency blood requests</h3>
          <p>Critical requests are broadcast to every matching donor and connected blood bank in the request's city within seconds.</p>
        </div>
        <button className="btn" style={{ background: "#fff", color: "var(--crimson-dark)" }} onClick={() => setShowForm(!showForm)}>+ Raise a Request</button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 26 }}>
          <div className="form-card">
            <h3>Raise an emergency request</h3>
            <div className="sub">Visible immediately to matching donors and blood banks.</div>
            <form onSubmit={submit}>
              {error && <div className="form-error">{error}</div>}
              <div className="field-row">
                <div className="field"><label>Blood group needed</label>
                  <select required value={form.blood_group} onChange={set("blood_group")}>
                    <option value="">Select</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="field"><label>Units required</label><input required type="number" min="1" value={form.units} onChange={set("units")} placeholder="e.g. 2" /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Hospital / patient location</label><input required value={form.hospital} onChange={set("hospital")} placeholder="e.g. Aditya Birla Hospital, Pune" /></div>
                <div className="field"><label>Urgency</label>
                  <select required value={form.urgency} onChange={set("urgency")}>
                    <option value="">Select</option>
                    <option value="critical">Critical — within hours</option>
                    <option value="high">High — within 24 hrs</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>Broadcast Request</button>
            </form>
          </div>
        </div>
      )}

      {!showForm && error && <div className="form-error">{error}</div>}
      <div className="req-grid">
        {requests.map((r) => (
          <div className="req-card" key={r.id}>
            <div className="req-bg">{r.blood_group}</div>
            <div className="req-info"><h4>{r.units} unit{r.units > 1 ? "s" : ""} needed</h4><p>{r.hospital}</p></div>
            <div className={`req-urgency urgency-${r.urgency}`}>{r.urgency}</div>
            <button className="btn btn-primary" style={{ padding: "9px 16px", fontSize: 13 }} onClick={() => help(r.id)}>Notify Me / Help</button>
          </div>
        ))}
        {requests.length === 0 && <div className="empty-note">No open requests right now.</div>}
      </div>
    </section>
  );
}
