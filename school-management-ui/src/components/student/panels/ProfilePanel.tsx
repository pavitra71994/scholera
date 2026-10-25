import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getStudentProfile, updateStudentProfile } from "../../../services/api";
import type { StudentProfile } from "../../../types/api";

export function StudentProfilePanel() {

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStudentProfile()
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
      setProfile(await updateStudentProfile({
        displayName: profile.displayName.trim(),
        emergencyContact: profile.emergencyContact?.trim() || null,
      }));
      setMessage("Profile changes saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="student-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Your details</p><h3>My Profile</h3></div>
        {profile?.rollNumber != null && <span className="status-pill">Roll no. {profile.rollNumber}</span>}
      </div>
      <p className="muted">Your class and family details are read-only. You can update your display name and emergency contact.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {profile ? (
        <form className="student-profile-form" onSubmit={save}>
          <label>Display name
            <input maxLength={160} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} required value={profile.displayName} />
          </label>
          <label>Date of birth
            <input readOnly value={profile.dateOfBirth ?? "Not provided"} />
          </label>
          <label>Mother’s name
            <input readOnly value={profile.motherName ?? "Not provided"} />
          </label>
          <label>Father’s name
            <input readOnly value={profile.fatherName ?? "Not provided"} />
          </label>
          <label>Class
            <input readOnly value={profile.className ?? "Not provided"} />
          </label>
          <label>Section
            <input readOnly value={profile.sectionName ?? "Not provided"} />
          </label>
          <label>Emergency contact <span className="muted">(optional)</span>
            <input maxLength={40} onChange={(event) => setProfile({ ...profile, emergencyContact: event.target.value })} value={profile.emergencyContact ?? ""} />
          </label>
          {message && <p className="success-message" role="status">{message}</p>}
          <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button>
        </form>
      ) : !error ? <p className="muted">Loading your profile…</p> : null}
    </section>
  );

}
