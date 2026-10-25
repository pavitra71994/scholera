import { HomePage } from "./components/HomePage";
import { LoginPage } from "./components/LoginPage";
import { useAuthSession } from "./hooks/useAuthSession";

export default function App() {
  const { user, checkingSession, signIn, signOut } = useAuthSession();

  if (checkingSession) {
    return <main className="loading-page"><span className="brand-mark">S</span><p>Opening Scholora…</p></main>;
  }
  return user
    ? <HomePage user={user} onLogout={signOut} />
    : <LoginPage onLogin={signIn} />;
}
