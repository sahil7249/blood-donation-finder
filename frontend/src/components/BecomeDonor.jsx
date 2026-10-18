import { useState } from "react";
import { api, BLOOD_GROUPS } from "../api.js";
import { useAuth } from "../auth.jsx";
import SignInPrompt from "./SignInPrompt.jsx";

const EMPTY = { name: "", age: "", blood_group: "", city: "", phone: "", last_donation: "" };

export default function BecomeDonor({ toast, go }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({ ...EMPTY, name: user?.name || "" }));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const body = { ...form, age: Number(form.age), last_donation: form.last_donation || null };
      await api.registerDonor(body);
      toast(`Thank you ${form.name.split(" ")[0]}! You're now listed as a ${form.blood_group} donor in ${form.city}.`);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <section className="active">
        <div className="section-head">
          <div className="eyebrow">Join the network</div>
          <h2>Become a donor</h2>
          <p>Registration takes under a minute. You'll only be contacted for requests matching your blood group and city.</p>
        </div>
        <SignInPrompt
          go={go}
          title="Sign in to become a donor"
          text="An account is required to register as a donor on LifeLink. Sign in or create an account to get listed, manage your availability, and save lives in your community."
        />
      </section>
    );
  }

  return (
    <section className="active">
      <div className="section-head">
        <div className="eyebrow">Join the network</div>
        <h2>Become a donor</h2>
        <p>Registration takes under a minute. You'll only be contacted for requests matching your blood group and city.</p>
      </div>
      <div className="form-wrap">
        <div className="form-card">
          <h3>Donor details</h3>
          <div className="sub">All fields are required unless marked optional.</div>
          <form onSubmit={submit}>
            {error && <div className="form-error">{error}</div>}
            <div className="field-row">
              <div className="field"><label>Full name</label><input required value={form.name} onChange={set("name")} placeholder="e.g. Aditi Sharma" /></div>
              <div className="field"><label>Age</label><input required type="number" min="18" max="65" value={form.age} onChange={set("age")} placeholder="18–65" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Blood group</label>
                <select required value={form.blood_group} onChange={set("blood_group")}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="field"><label>City</label><input required value={form.city} onChange={set("city")} placeholder="e.g. Pune" /></div>
            </div>
            <div className="field"><label>Phone number</label><input required inputMode="numeric" pattern="\d{10}" maxLength={10} value={form.phone} onChange={set("phone")} placeholder="10-digit mobile number" /></div>
            <div className="field"><label>Last donation date (optional)</label><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.last_donation} onChange={set("last_donation")} /></div>
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
              {busy ? "Registering…" : "Register as Donor"}
            </button>
          </form>
        </div>
        <div>
          <div className="form-note">
            <b>Eligibility basics</b><br /><br />
            • Age 18–65, weight above 50 kg<br />
            • Gap of at least 90 days since last donation<br />
            • No fever, infection, or major surgery in the last 6 months<br /><br />
            LifeLink shows you as <b>"available"</b> automatically, and switches you to <b>"cooldown"</b> for 90 days after your last donation — so you're never contacted too soon.
          </div>
        </div>
      </div>
    </section>
  );
}
