import { Link } from "react-router-dom";

export default function SignInPrompt({ go, title = "Sign in to continue", text }) {
  return (
    <div className="form-wrap" style={{ justifyContent: "center", margin: "24px auto" }}>
      <div className="form-card" style={{ maxWidth: 520, textAlign: "center" }}>
        <div style={{ display: "inline-flex", padding: 12, borderRadius: "50%", background: "#FBE8E4", color: "var(--crimson)", margin: "0 auto 12px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h3 style={{ fontSize: 22, marginBottom: 8 }}>{title}</h3>
        <div className="sub" style={{ marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>{text}</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {go ? (
            <button className="btn btn-primary" onClick={() => go("auth")}>Sign in or Sign up</button>
          ) : (
            <Link to="/auth" className="btn btn-primary">Sign in or Sign up</Link>
          )}
          {go ? (
            <button className="btn btn-outline" onClick={() => go("search")}>Find Donors</button>
          ) : (
            <Link to="/find-donors" className="btn btn-outline">Find Donors</Link>
          )}
        </div>
      </div>
    </div>
  );
}

  