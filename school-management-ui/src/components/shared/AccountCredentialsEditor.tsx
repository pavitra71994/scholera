import { useState } from "react";
import type { FormEvent } from "react";

export function AccountCredentialsEditor({
  username,
  onSave,
  compact = false,
  notifyCurrentUser = false,
}: {
  username: string;
  onSave: (credentials: { username: string; newPassword: string | null }) => Promise<string>;
  compact?: boolean;
  notifyCurrentUser?: boolean;
}) {
  const [updatedUsername, setUpdatedUsername] = useState(username);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setMessage(await onSave({
        username: updatedUsername.trim(),
        newPassword: newPassword || null,
      }));
      setNewPassword("");
      if (notifyCurrentUser) {
        window.dispatchEvent(new CustomEvent("account-credentials-updated", {
          detail: { username: updatedUsername.trim() },
        }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update account credentials.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={compact ? "assignment-editor" : "student-profile-form"} onSubmit={submit}>
      <label className={compact ? "module-field" : undefined}>Username
        <input
          autoComplete="username"
          maxLength={100}
          onChange={(event) => setUpdatedUsername(event.target.value)}
          required
          value={updatedUsername}
        />
      </label>
      <label className={compact ? "module-field" : undefined}>New password <span className="muted">(optional)</span>
        <input
          autoComplete="new-password"
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Leave blank to keep current password"
          type="password"
          value={newPassword}
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      <button className="quiet-button" disabled={saving} type="submit">
        {saving ? "Saving…" : "Save credentials"}
      </button>
    </form>
  );
}
