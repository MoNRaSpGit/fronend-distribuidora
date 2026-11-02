import { useState, type FormEvent } from "react";
import { EMPRESA_LOGO_URL } from "../distribuidora.shared";

interface Props {
  onLogin: (username: string, password: string) => void;
  loading: boolean;
  error: string;
}

// Login real desde 02/11/2026 (antes no habia usuarios). Los usuarios se
// crean a mano con backend/scripts/create-distribuidora-user.js.
export function LoginScreen({ onLogin, loading, error }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    onLogin(username.trim(), password);
  }

  return (
    <div className="login-shell">
      <form className="modal login-card" onSubmit={handleSubmit}>
        <img className="login-logo" src={EMPRESA_LOGO_URL} alt="" />
        <h1>Distribuidora</h1>
        <p className="confirm-message">Iniciá sesión para continuar.</p>

        <label className="field">
          <span>Usuario</span>
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Contraseña</span>
          <div className="password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)}>
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
        </label>

        {error && <p className="message message-error">{error}</p>}

        <button type="submit" className="button button-primary button-block" disabled={loading || !username.trim() || !password}>
          {loading ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
