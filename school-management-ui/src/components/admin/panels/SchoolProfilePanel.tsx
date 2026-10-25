import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getSchoolProfile, updateSchoolProfile } from "../../../services/api";
import type { SchoolProfile } from "../../../types/api";

export function SchoolProfilePanel() {

  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSchoolProfile()
      .then(setProfile)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load school settings."));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      setProfile(await updateSchoolProfile(profile));
      setMessage("School settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save school settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-card" id="school-profile">
      <div className="section-heading">
        <div><p className="eyebrow">Getting started</p><h3>School profile</h3></div>
        <span className="status-pill">Setup</span>
      </div>
      <p className="muted">Set your school's name and local timezone. These settings are used across attendance and academic records.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {profile ? (
        <form className="settings-form" onSubmit={save}>
          <label>School name<input maxLength={160} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required value={profile.name} /></label>
          <label>Timezone<input maxLength={80} onChange={(event) => setProfile({ ...profile, timezone: event.target.value })} required value={profile.timezone} /></label>
          {message && <p className="success-message" role="status">{message}</p>}
          <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button>
        </form>
      ) : !error ? <p className="muted">Loading school profile…</p> : null}
    </section>
  );

}
