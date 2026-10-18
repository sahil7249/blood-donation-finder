import { useState } from "react";
import { useAuth } from "../auth.jsx";

export default function Auth({ toast, onDone }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isUp = mode === "signup";
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const switchTo = (m) => { setMode(m); setError(""); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const user = isUp ? await signUp(form.name, form.email, form.password) : await signIn(form.email, form.password);
      toast(isUp ? `Welcome to LifeLink, ${user.name.split(" ")[0]}!` : `Welcome back, ${user.name.split(" ")[0]}.`);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="active">
      <div className="section-head">
        <div className="eyebrow">Your account</div>
        <h2>{isUp ? "Create your account" : "Sign in to LifeLink"}</h2>
        <p>{isUp ? "One account lets you register as a donor, raise requests, and manage your blood bank." : "Sign in to register as a donor, request contact, raise emergency requests or manage your blood bank."}</p>
      </div>
      <div className="form-wrap">
        <div className="form-card">
          <div className="auth-tabs">
            <button className={!isUp ? "on" : ""} onClick={() => switchTo("signin")}>Sign in</button>
            <button className={isUp ? "on" : ""} onClick={() => switchTo("signup")}>Sign up</button>
          </div>
          <form onSubmit={submit}>
            {error && <div className="form-error">{error}</div>}
            {isUp && (
              <div className="field"><label>Full name</label><input required autoComplete="name" value={form.name} onChange={set("name")} placeholder="e.g. Aditi Sharma" /></div>
            )}
            <div className="field"><label>Email</label><input required type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" /></div>
            <div className="field">
              <label>Password</label>
              <div className="pw-wrap">
                <input required type={showPw ? "text" : "password"} minLength={isUp ? 8 : undefined} autoComplete={isUp ? "new-password" : "current-password"}
                  value={form.password} onChange={set("password")} placeholder={isUp ? "At least 8 characters" : "Your password"} />
                <button type="button" onClick={() => setShowPw(!showPw)}>{showPw ? "Hide" : "Show"}</button>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
              {busy ? "Please wait…" : isUp ? "Create account" : "Sign in"}
            </button>
          </form>
          <div className="auth-switch">
            {isUp ? "Already have an account? " : "New to LifeLink? "}
            <button onClick={() => switchTo(isUp ? "signin" : "signup")}>{isUp ? "Sign in" : "Create an account"}</button>
          </div>
        </div>
        <div className="form-note">
          <b>Why an account?</b><br /><br />
          • Finding donors and viewing connected blood banks is open to everyone<br />
          • An authorized account is required to contact donors, register as a donor, access emergency requests, and manage blood banks<br />
          • Blood banks you register are tied to your account, so only you can update their stock<br />
          • Use a password of 8+ characters that isn't a common word
        </div>
      </div>
    </section>
  );
}
