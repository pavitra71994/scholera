import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getTeacherProfile, updateTeacherProfile } from "../../../services/api";
import { updateMyCredentials } from "../../../services/api";
import type { TeacherProfile } from "../../../types/api";
import { AccountCredentialsEditor } from "../../shared/AccountCredentialsEditor";

export function TeacherProfilePage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTeacherProfile()
      .then(setProfile)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load your profile."));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setProfile(await updateTeacherProfile({
        displayName: profile.displayName.trim(),
        phone: profile.phone?.trim() || null,
      }));
      setMessage("Profile changes saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="teacher-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Your details</p><h3>My Profile</h3></div>
      </div>
      <p className="muted">You can edit your display name and optional phone number. Assignments are managed by the administrator.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {profile ? (
        <form className="student-profile-form" onSubmit={save}>
          <label>Display name
            <input maxLength={160} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} required value={profile.displayName} />
          </label>
          <label>Phone <span className="muted">(optional)</span>
            <input maxLength={40} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} value={profile.phone ?? ""} />
          </label>
          <div className="teacher-assigned-list">
            <h4>Assigned sections</h4>
            {profile.sections.length ? (
              <ul>{profile.sections.map((section) => (
                <li key={section.id}>{section.className} · {section.name}</li>
              ))}</ul>
            ) : <p className="class-empty">No sections assigned yet.</p>}
          </div>
          {message && <p className="success-message" role="status">{message}</p>}
          <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button>
        </form>
      ) : !error ? <p className="muted">Loading your profile…</p> : null}
      {profile && (
        <section className="profile-account-settings">
          <h4>Login credentials</h4>
          <p className="muted">Change your username or set a new password. Your current password is not required.</p>
          <AccountCredentialsEditor
            notifyCurrentUser
            onSave={async (credentials) => {
              const updated = await updateMyCredentials(credentials);
              setProfile((current) => current ? { ...current, username: updated.username } : current);
              return "Login credentials saved.";
            }}
            username={profile.username}
          />
        </section>
      )}
    </section>
  );
}
