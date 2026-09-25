
import { useState } from "react";
import { useAuth } from "../auth";
import { ApiError } from "../api";

export function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState("admin@agency.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#211a16",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      >
        {/* Simple name */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "24px",
            color: "#cbbba6",
            fontSize: "24px",
            fontWeight: "600",
          }}
        >
          TaskFlow
        </div>

        {/* Login Card - keeps your original .card color */}
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();

            setPending(true);
            setError(null);

            try {
              await login(email, password);
            } catch (err) {
              setError(
                err instanceof ApiError
                  ? err.message
                  : "Could not sign in"
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "28px",
              textAlign: "center",
            }}
          >
            Sign in
          </h2>

          <label>Email</label>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />

          <label>Password</label>

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />

          {error && <div className="error">{error}</div>}

          <button
            className="btn copper"
            style={{
              marginTop: 18,
              width: "100%",
            }}
            disabled={pending}
          >
            {pending ? "Signing in…" : "Enter dashboard"}
          </button>

          <div className="demo-accounts">
            Password for all seeded users:{" "}
            <code>Password123!</code>

            <code>admin@agency.test</code>
            <code>pm.ava@agency.test</code>
            <code>dev.maya@agency.test</code>
          </div>
        </form>
      </div>
    </div>
  );
}
