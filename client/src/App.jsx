import { useCallback, useEffect, useMemo, useState } from "react";

const USER_API = import.meta.env.VITE_USER_API_URL || "http://127.0.0.1:5000";
const ADMIN_API = import.meta.env.VITE_ADMIN_API_URL || "http://127.0.0.1:5001";

// Keep token headers and API error messages consistent across the screens.
async function request(base, path, token, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "That didn’t work. Please try again.");
  return payload;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("little-link-token") || "");
  const [user, setUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(Boolean(token));
  const [authError, setAuthError] = useState("");

  const signOut = useCallback(() => {
    localStorage.removeItem("little-link-token");
    setToken("");
    setUser(null);
  }, []);

  // Restore the saved session when the app opens.
  useEffect(() => {
    if (!token) {
      setAuthBusy(false);
      return;
    }
    request(USER_API, "/api/auth/me", token)
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => signOut())
      .finally(() => setAuthBusy(false));
  }, [token, signOut]);

  async function signIn(credentials, mode) {
    setAuthError("");
    const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    try {
      const result = await request(USER_API, path, "", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      localStorage.setItem("little-link-token", result.token);
      setToken(result.token);
      setUser(result.user);
    } catch (error) {
      setAuthError(error.message);
    }
  }

  if (authBusy) return <div className="loading-screen"><span className="brand-mark">l.</span><p>Getting things ready…</p></div>;
  if (!user) return <AuthScreen onSubmit={signIn} error={authError} />;
  return <Dashboard user={user} token={token} onSignOut={signOut} />;
}

function AuthScreen({ onSubmit, error }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await onSubmit(values, mode);
    setBusy(false);
  }

  return (
    <main className="auth-page">
      <div className="auth-aside">
        <a className="brand" href="#">
          <span className="brand-mark">l.</span>
          <span>little link</span>
        </a>
        <div className="aside-copy">
          <span className="eyebrow">A little more intentional</span>
          <h1>
            Good links
            <br />
            go <em>places.</em>
          </h1>
          <p>Keep your links tidy, see where they go, and share them with a little more ease.</p>
        </div>
        <div className="aside-note">
          <span className="tiny-sun">✳</span> Yours to use. Yours to keep.
        </div>
        <span className="circle-deco circle-one" />
        <span className="circle-deco circle-two" />
      </div>
      <section className="auth-card-wrap">
        <div className="auth-card">
          <span className="eyebrow">
            {mode === "login" ? "Welcome back" : "A good place to start"}
          </span>
          <h2>{mode === "login" ? "Sign in to your links" : "Make yourself at home"}</h2>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Your little corner of the internet is right here."
              : "Create an account to start making shorter links."}
          </p>
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength="60"
                  placeholder="How should we call you?"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength="8"
                placeholder="At least 8 characters"
              />
            </label>
            {error && (
              <div className="notice error-notice" role="alert">
                {error}
              </div>
            )}
            <button className="button button-dark full-button" disabled={busy}>
              {busy ? "One moment…" : mode === "login" ? "Sign in" : "Create my account"}
              <span>↗</span>
            </button>
          </form>
          <p className="auth-switch">
            {mode === "login" ? "New around here?" : "Already have an account?"}{" "}
            <button
              className="text-button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </button>
          </p>
          <div className="privacy-note">
            <span>●</span> Running privately on your own computer
          </div>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ user, token, onSignOut }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [section, setSection] = useState("links");
  const [adminData, setAdminData] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminError, setAdminError] = useState("");

  const loadLinks = useCallback(async () => {
    setLoadError("");
    try {
      const result = await request(USER_API, "/api/urls", token);
      setLinks(result.urls);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  useEffect(() => {
    if (section !== "admin" || user.role !== "admin") return;
    setAdminError("");
    // Admin data comes from its own server, but uses this same sign-in token.
    Promise.all([
      request(ADMIN_API, "/api/admin/overview", token),
      request(ADMIN_API, "/api/admin/users", token)
    ]).then(([overview, result]) => {
      setAdminData(overview);
      setAdminUsers(result.users);
    }).catch((error) => setAdminError(error.message));
  }, [section, token, user.role]);

  async function createLink(event) {
    event.preventDefault();
    setNotice("");
    setSaving(true);
    try {
      const result = await request(USER_API, "/api/urls", token, {
        method: "POST",
        body: JSON.stringify({ url: urlInput })
      });
      setLinks((current) => [result.url, ...current]);
      setUrlInput("");
      setNotice("Your new link is ready to go.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeLink(id) {
    if (!window.confirm("Remove this short link and its click history?")) return;
    try {
      await request(USER_API, `/api/urls/${id}`, token, { method: "DELETE" });
      setLinks((current) => current.filter((link) => link._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function copyLink(value) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied. Go on, share it.");
      return true;
    } catch {
      setNotice("Copy wasn’t available here. Select and copy the link instead.");
      return false;
    }
  }

  const totalClicks = useMemo(() => links.reduce((sum, link) => sum + link.clickCount, 0), [links]);
  const isAdminSection = section === "admin" && user.role === "admin";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="#">
          <span className="brand-mark">l.</span>
          <span>little link</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <button
          className={`nav-item ${section === "links" ? "active" : ""}`}
          onClick={() => setSection("links")}
        >
          <span className="nav-icon">↗</span>
          My links
          <span className="nav-count">{links.length}</span>
        </button>
        {user.role === "admin" && (
          <button
            className={`nav-item ${section === "admin" ? "active" : ""}`}
            onClick={() => setSection("admin")}
          >
            <span className="nav-icon">▦</span>
            Admin desk
          </button>
        )}
        <div className="sidebar-bottom">
          <div className="local-badge">
            <span /> Local &amp; private
          </div>
          <div className="profile-card">
            <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
            <div className="profile-copy">
              <strong>{user.name}</strong>
              <span>{user.role === "admin" ? "Administrator" : "Personal account"}</span>
            </div>
            <button
              className="signout-button"
              onClick={onSignOut}
              title="Sign out"
              aria-label="Sign out"
            >
              ↗
            </button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="crumb">Workspace</span>
            <span className="crumb-separator">/</span>
            <strong>{isAdminSection ? "Admin desk" : "My links"}</strong>
          </div>
          <span className="today-label">
            {new Intl.DateTimeFormat(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric"
            }).format(new Date())}
          </span>
        </header>

        {isAdminSection ? (
          <AdminPanel overview={adminData} users={adminUsers} error={adminError} />
        ) : (
          <section className="dashboard-content">
            <div className="welcome-row">
              <div>
                <span className="eyebrow">YOUR LITTLE LINK LIBRARY</span>
                <h1>
                  Good to see you, {user.name.split(" ")[0]}
                  <span className="wave">✳</span>
                </h1>
                <p>Short links, all in one place. Make yourself at home.</p>
              </div>
              <div className="date-stamp">
                <span>✳</span>
                <div>
                  <strong>Made for sharing</strong>
                  <small>One good link at a time</small>
                </div>
              </div>
            </div>

            <div className="stats-row">
              <StatCard
                label="Links made"
                value={links.length}
                foot="Your growing collection"
                icon="↗"
              />
              <StatCard
                label="All-time clicks"
                value={totalClicks}
                foot="People finding their way"
                icon="⌁"
              />
              <StatCard
                label="Home base"
                value="Local"
                foot="Your data stays on this device"
                icon="⌂"
              />
            </div>

            <div className="create-card">
              <div className="create-heading">
                <div className="create-icon">↗</div>
                <div>
                  <h2>Make a little link</h2>
                  <p>Paste a long link. We’ll tidy it up for you.</p>
                </div>
              </div>
              <form className="create-form" onSubmit={createLink}>
                <input
                  type="url"
                  required
                  maxLength="2048"
                  placeholder="https://that-really-long-link.com/..."
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                />
                <button className="button button-dark" disabled={saving}>
                  {saving ? "Making it…" : "Shorten link"} <span>↗</span>
                </button>
              </form>
              {notice && (
                <p
                  className={`inline-notice ${
                    notice.includes("ready") || notice.includes("Copied")
                      ? "success-text"
                      : "error-text"
                  }`}
                  role="status"
                >
                  {notice}
                </p>
              )}
            </div>

            <div className="links-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">THE GOOD STUFF</span>
                  <h2>
                    Your links <span className="soft-count">{links.length}</span>
                  </h2>
                </div>
                <span className="section-caption">A little history goes a long way</span>
              </div>
              {loadError && (
                <div className="notice error-notice">
                  {loadError}{" "}
                  <button className="text-button" onClick={loadLinks}>
                    Try again
                  </button>
                </div>
              )}
              {loading ? (
                <div className="empty-state">Gathering your links…</div>
              ) : links.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-doodle">↗</span>
                  <h3>Nothing here just yet</h3>
                  <p>Your first short link is only a paste away.</p>
                </div>
              ) : (
                <div className="link-list">
                  {links.map((link) => (
                    <LinkRow
                      key={link._id}
                      link={link}
                      onCopy={copyLink}
                      onAnalytics={setSelected}
                      onRemove={removeLink}
                    />
                  ))}
                </div>
              )}
            </div>

            <footer className="page-footer">
              <span>✳</span> A small, local tool for the links you love.
            </footer>
          </section>
        )}
      </main>
      {selected && (
        <AnalyticsPanel link={selected} token={token} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function StatCard({ label, value, foot, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-foot">{foot}</span>
    </div>
  );
}

function LinkRow({ link, onCopy, onAnalytics, onRemove }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (await onCopy(link.shortUrl)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <article className="link-row">
      <div className="link-symbol">↗</div>
      <div className="link-main">
        <div className="short-link-line">
          <a className="short-link" href={link.shortUrl} target="_blank" rel="noreferrer">
            {link.shortUrl.replace(/^https?:\/\//, "")}
          </a>
          <button
            className="inline-copy-button"
            aria-label={copied ? "Short link copied" : "Copy short link"}
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <span className="original-link" title={link.originalUrl}>
          {link.originalUrl}
        </span>
      </div>
      <div className="link-clicks">
        <strong>{link.clickCount}</strong>
        <span>clicks</span>
      </div>
      <div className="link-created">
        {new Date(link.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric"
        })}
      </div>
      <div className="link-actions">
        <button title="View analytics" aria-label="View analytics" onClick={() => onAnalytics(link)}>
          ⌁
        </button>
        <button title="Remove link" aria-label="Remove link" onClick={() => onRemove(link._id)}>
          ×
        </button>
      </div>
    </article>
  );
}

function AnalyticsPanel({ link, token, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    request(USER_API, `/api/urls/${link._id}/analytics`, token)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [link._id, token]);

  const maxClicks = Math.max(1, ...(data?.lastSevenDays || []).map((day) => day.clicks));
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="analytics-drawer">
        <div className="drawer-top">
          <div>
            <span className="eyebrow">A CLOSER LOOK</span>
            <h2>Link notes</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close analytics">
            ×
          </button>
        </div>

        <p className="drawer-link">{link.shortUrl}</p>
        <a className="drawer-destination" href={link.originalUrl} target="_blank" rel="noreferrer">
          {link.originalUrl}
        </a>
        <div className="drawer-total">
          <strong>{data?.totalClicks ?? link.clickCount}</strong>
          <span>total visits so far</span>
        </div>

        <div className="chart-card">
          <h3>Last seven days</h3>
          {error ? (
            <p className="error-text">{error}</p>
          ) : !data ? (
            <p className="muted">Loading the little details…</p>
          ) : (
            <div className="bar-chart">
              {data.lastSevenDays.map((day) => (
                <div className="bar-column" key={day.date}>
                  <span className="bar-number">{day.clicks || ""}</span>
                  <div className="bar-track">
                    <span
                      className="bar-fill"
                      style={{
                        height: `${Math.max(4, (day.clicks / maxClicks) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="bar-day">
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                      weekday: "short"
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="recent-card">
          <h3>Recent visits</h3>
          {data?.recent?.length ? (
            data.recent.map((visit, index) => (
              <div className="visit-row" key={`${visit.clickedAt}-${index}`}>
                <span className="visit-dot" />
                <span>{visit.referrer}</span>
                <time>{new Date(visit.clickedAt).toLocaleString()}</time>
              </div>
            ))
          ) : (
            <p className="muted">
              {data ? "No visits yet. Share your link and check back." : " "}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function AdminPanel({ overview, users, error }) {
  return (
    <section className="dashboard-content admin-content">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">THE BIG PICTURE</span>
          <h1>
            Admin desk <span className="wave">✳</span>
          </h1>
          <p>A friendly overview of the people and links on this machine.</p>
        </div>
        <div className="date-stamp">
          <span>⌂</span>
          <div>
            <strong>Private by design</strong>
            <small>Only available on this computer</small>
          </div>
        </div>
      </div>

      {error && <div className="notice error-notice">{error}</div>}

      {!overview && !error ? (
        <div className="empty-state">Gathering the overview…</div>
      ) : (
        overview && (
          <>
            <div className="stats-row">
              <StatCard
                label="People"
                value={overview.totals.users}
                foot="Registered accounts"
                icon="♧"
              />
              <StatCard
                label="Short links"
                value={overview.totals.links}
                foot="Across all accounts"
                icon="↗"
              />
              <StatCard
                label="All-time clicks"
                value={overview.totals.clicks}
                foot="Visits recorded locally"
                icon="⌁"
              />
            </div>

            <div className="admin-grid">
              <section className="admin-card">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">NEW AROUND HERE</span>
                    <h2>Recent people</h2>
                  </div>
                </div>
                {overview.latestUsers.length ? (
                  overview.latestUsers.map((person) => (
                    <div className="admin-person" key={person._id}>
                      <div className="avatar small-avatar">
                        {person.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <strong>{person.name}</strong>
                        <span>{person.email}</span>
                      </div>
                      <time>{new Date(person.createdAt).toLocaleDateString()}</time>
                    </div>
                  ))
                ) : (
                  <p className="muted">No accounts yet.</p>
                )}
              </section>

              <section className="admin-card">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">FRESHLY MADE</span>
                    <h2>Recent links</h2>
                  </div>
                </div>
                {overview.latestLinks.length ? (
                  overview.latestLinks.map((link) => (
                    <div className="admin-link" key={link._id}>
                      <div>
                        <a href={link.shortUrl} target="_blank" rel="noreferrer">
                          {link.shortUrl.replace(/^https?:\/\//, "")}
                        </a>
                        <span>
                          {link.owner?.name || "Unknown"} · {link.clickCount} clicks
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">No links yet.</p>
                )}
              </section>
            </div>

            <section className="admin-card all-users">
              <div className="section-heading compact">
                <div>
                  <span className="eyebrow">ACCOUNT DIRECTORY</span>
                  <h2>People using Little Link</h2>
                </div>
                <span className="section-caption">Up to 100 accounts</span>
              </div>
              <div className="user-table-wrap">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>PERSON</th>
                      <th>EMAIL</th>
                      <th>LINKS</th>
                      <th>CLICKS</th>
                      <th>JOINED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((person) => (
                      <tr key={person._id}>
                        <td>{person.name}</td>
                        <td>{person.email}</td>
                        <td>{person.linkCount}</td>
                        <td>{person.clickCount}</td>
                        <td>{new Date(person.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )
      )}
    </section>
  );
}

export default App;
