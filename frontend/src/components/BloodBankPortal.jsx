import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, BLOOD_GROUPS } from "../api.js";
import { useAuth } from "../auth.jsx";
import SignInPrompt from "./SignInPrompt.jsx";

const stockClass = (n) => (n <= 5 ? "stock-crit" : n <= 15 ? "stock-low" : "stock-ok");
const EMPTY = { name: "", city: "", license_id: "", address: "", phone: "", email: "" };

function Directory({ banks, toast, go, user, onUpdateStock }) {
  const [filterMine, setFilterMine] = useState(false);
  const myBanks = user ? banks.filter((b) => b.owner === user.id || b.is_owner) : [];
  const displayedBanks = filterMine ? myBanks : banks;

  const handleConnect = (b) => {
    if (!user) {
      toast("Please sign in to connect with blood banks.");
      if (go) go("auth");
      return;
    }
    toast(`Connection request sent to ${b.name}.`);
  };

  return (
    <div>
      {user && myBanks.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            className={`btn ${!filterMine ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "8px 18px", fontSize: 13, borderRadius: 999 }}
            onClick={() => setFilterMine(false)}
          >
            All Connected Banks ({banks.length})
          </button>
          <button
            className={`btn ${filterMine ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "8px 18px", fontSize: 13, borderRadius: 999 }}
            onClick={() => setFilterMine(true)}
          >
            My Registered Banks ({myBanks.length})
          </button>
        </div>
      )}

      {filterMine && myBanks.length === 0 && (
        <div className="empty-note">You haven't registered any blood banks yet.</div>
      )}

      <div className="bank-list">
        {displayedBanks.map((b) => {
          const isOwner = user && (b.owner === user.id || b.is_owner);
          const groups = Object.entries(b.stock).filter(([, n]) => n > 0);
          return (
            <div className="bank-card" key={b.id} style={isOwner ? { border: "1.5px solid var(--crimson-dark)" } : undefined}>
              <div className="top">
                <div>
                  <h4>{b.name}</h4>
                  <div className="addr">📍 {b.city}</div>
                  {b.email && <div className="addr" style={{ fontSize: 12, marginTop: 2 }}>✉ {b.email}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {isOwner && (
                    <span className="verified" style={{ background: "#FBE8E4", color: "var(--crimson-dark)" }}>
                      ★ Your Bank
                    </span>
                  )}
                  {b.verified ? (
                    <span className="verified">✓ Verified</span>
                  ) : (
                    <span className="verified" style={{ background: "#FDECD8", color: "var(--warn)" }}>
                      Pending
                    </span>
                  )}
                </div>
              </div>
              {groups.length ? (
                <div className="stock-grid">
                  {groups.map(([g, n]) => <div key={g} className={`stock-pill ${stockClass(n)}`}><b>{n}</b>{g}</div>)}
                </div>
              ) : <div className="addr">Inventory not published yet.</div>}
              {isOwner ? (
                <button
                  className="btn btn-primary connect-btn"
                  onClick={() => onUpdateStock(b.id)}
                  style={{ justifyContent: "center" }}
                >
                  Manage / Update Stock
                </button>
              ) : (
                <button
                  className="btn btn-teal connect-btn"
                  onClick={() => handleConnect(b)}
                  title={!user ? "Sign in to contact this blood bank" : undefined}
                >
                  {user ? "Connect / Contact Bank" : "Sign in to Connect Bank"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RegisterBank({ toast, onDone, user }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, email: user?.email || "" }));
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError("");
    try {
      await api.registerBank(form);
      toast(`${form.name} submitted for verification. You'll be notified once approved.`);
      setForm(EMPTY); onDone();
    } catch (err) { setError(err.message); }
  };
  return (
    <div className="form-wrap">
      <div className="form-card">
        <h3>Connect your blood bank</h3>
        <div className="sub">Submitted details are reviewed and verified before your bank goes live on the network.</div>
        <form onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          <div className="field"><label>Blood bank name</label><input required value={form.name} onChange={set("name")} placeholder="e.g. Sanjeevani Blood Bank" /></div>
          <div className="field-row">
            <div className="field"><label>City</label><input required value={form.city} onChange={set("city")} placeholder="e.g. Pimpri-Chinchwad" /></div>
            <div className="field"><label>License / registration ID</label><input required value={form.license_id} onChange={set("license_id")} placeholder="e.g. MH-BB-2291" /></div>
          </div>
          <div className="field"><label>Address</label><input required value={form.address} onChange={set("address")} placeholder="Full address" /></div>
          <div className="field-row">
            <div className="field"><label>Contact number</label><input required value={form.phone} onChange={set("phone")} placeholder="Official contact number" /></div>
            <div className="field"><label>Official email address</label><input required type="email" value={form.email} onChange={set("email")} placeholder="contact@bloodbank.org" /></div>
          </div>
          <button className="btn btn-teal" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>Submit for Verification</button>
        </form>
      </div>
      <div className="form-note">
        <b>Why connect?</b><br /><br />
        • Your inventory becomes visible to nearby hospitals and donors instantly<br />
        • Emergency requests in your city route to your dashboard first<br />
        • Only your account can update its unit stock and live inventory<br />
        • No cost to public and charitable blood banks
      </div>
    </div>
  );
}

function Inventory({ myBanks, toast, onSaved, onGoRegister, user }) {
  const [bankId, setBankId] = useState(myBanks[0]?.id ?? "");
  const [units, setUnits] = useState({});
  const bank = myBanks.find((b) => b.id === Number(bankId));

  useEffect(() => {
    if (myBanks.length && (!bankId || !myBanks.some((b) => b.id === Number(bankId)))) {
      setBankId(myBanks[0].id);
    }
  }, [myBanks, bankId]);

  useEffect(() => {
    setUnits(bank ? { ...bank.stock } : {});
  }, [bankId, bank]);

  const save = async () => {
    if (!bank) return;
    const stock = Object.fromEntries(BLOOD_GROUPS.map((g) => [g, parseInt(units[g]) || 0]));
    try {
      await api.saveStock(bank.id, stock);
      toast(`Inventory updated for ${bank.name}.`);
      onSaved();
    } catch (e) {
      toast(e.message);
    }
  };

  if (!myBanks.length) {
    return (
      <div className="form-card" style={{ maxWidth: 540, margin: "32px auto", textAlign: "center", padding: "40px 28px" }}>
        <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", background: "#FBE8E4", color: "var(--crimson)", margin: "0 auto 14px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>No registered blood banks</h3>
        <p className="sub" style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
          You can only update inventory for blood banks registered by your account ({user?.email}). Register your blood bank to start managing live stock.
        </p>
        <button className="btn btn-primary" onClick={onGoRegister}>Register Your Blood Bank</button>
      </div>
    );
  }

  return (
    <div className="inventory-form">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 className="display" style={{ color: "var(--crimson-dark)", fontSize: 20 }}>Update unit stock</h3>
          <p className="sub" style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            Only you ({user?.name || user?.email}) can manage stock for your registered blood banks.
          </p>
        </div>
        <span className="verified" style={{ background: bank?.verified ? "#E8F8EE" : "#FDECD8", color: bank?.verified ? "var(--teal)" : "var(--warn)" }}>
          {bank?.verified ? "✓ Verified Bank" : "Verification Pending"}
        </span>
      </div>

      <div className="field" style={{ marginTop: 18, maxWidth: 380 }}>
        <label>Select registered blood bank</label>
        {myBanks.length === 1 ? (
          <div style={{ padding: "10px 14px", background: "#fff", borderRadius: 8, border: "1.5px solid var(--line)", fontWeight: 600, color: "var(--crimson-dark)" }}>
            {myBanks[0].name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({myBanks[0].city})</span>
          </div>
        ) : (
          <select value={bankId} onChange={(e) => setBankId(e.target.value)}>
            {myBanks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="inv-grid">
        {BLOOD_GROUPS.map((g) => (
          <div className="inv-cell" key={g}>
            <label>{g} units</label>
            <input
              type="number"
              min="0"
              value={units[g] ?? 0}
              onChange={(e) => setUnits({ ...units, [g]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={save}>
        Save Inventory Update
      </button>
    </div>
  );
}

export default function BloodBankPortal({ toast, go }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState(tabParam && ["directory", "register", "inventory"].includes(tabParam) ? tabParam : "directory");
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState("");
  const load = () => api.banks().then(setBanks).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tabParam && ["directory", "register", "inventory"].includes(tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  const switchTab = (id) => {
    setTab(id);
    setSearchParams(id === "directory" ? {} : { tab: id });
  };

  const myBanks = user ? banks.filter((b) => b.owner === user.id || b.is_owner) : [];
  const TABS = [
    ["directory", "Connected Blood Banks"],
    ["register", "Register Your Blood Bank"],
    ["inventory", user ? `Update Inventory (${myBanks.length})` : "Update Inventory"],
  ];

  return (
    <section className="active">
      <div className="section-head">
        <div className="eyebrow">For blood banks</div>
        <h2>Blood bank portal</h2>
        <p>Connect your blood bank to the network, publish live inventory, and receive donor &amp; hospital requests directly.</p>
      </div>
      <div className="bank-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => switchTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {error && <div className="form-error">{error}</div>}
      {tab === "directory" && (
        <Directory
          banks={banks}
          toast={toast}
          go={go}
          user={user}
          onUpdateStock={() => {
            switchTab("inventory");
          }}
        />
      )}
      {tab === "register" && (
        user ? (
          <RegisterBank toast={toast} onDone={() => { load(); switchTab("inventory"); }} user={user} />
        ) : (
          <SignInPrompt
            go={go}
            title="Sign in to register your blood bank"
            text="Submitting a blood bank for verification on the LifeLink network requires an authorized account. Sign in or sign up to continue."
          />
        )
      )}
      {tab === "inventory" && (
        user ? (
          <Inventory
            myBanks={myBanks}
            toast={toast}
            onSaved={load}
            onGoRegister={() => switchTab("register")}
            user={user}
          />
        ) : (
          <SignInPrompt
            go={go}
            title="Sign in to manage inventory"
            text="Updating unit stock is restricted to authorized blood bank accounts. Sign in to update blood group counts."
          />
        )
      )}
    </section>
  );
}
