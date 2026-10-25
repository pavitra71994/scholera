import { LoginForm } from "./auth/LoginForm";

export function LoginPage({
  onLogin,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
}) {
  return (
    <main className="signin-page">
      <section className="signin-copy">
        <div className="brand brand-light"><span className="brand-mark">S</span> Scholora</div>
        <div>
          <p className="eyebrow">A calmer school day</p>
          <h1>Everything your school needs, in one place.</h1>
          <p className="intro">A simple space for school teams, teachers, and students to stay in sync.</p>
        </div>
        <div className="signin-footnote">One school. One shared community.</div>
        <div aria-hidden="true" className="sun-orbit"><span /><span /><span /></div>
      </section>
      <section className="signin-panel">
        <div className="mobile-brand brand"><span className="brand-mark">S</span> Scholora</div>
        <div className="signin-card">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to your account</h2>
          <p className="muted">Use the account provided by your school administrator.</p>
          <LoginForm onLogin={onLogin} />
          <div className="role-note">
            <span className="role-dots" aria-hidden="true"><i /><i /><i /></span>
            One secure sign-in for admins, teachers, and students
          </div>
        </div>
        <p className="panel-footer">Need help? Please contact your school administrator.</p>
      </section>
    </main>
  );
}
