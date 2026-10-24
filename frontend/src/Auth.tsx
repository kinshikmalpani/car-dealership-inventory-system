import { useState, type FormEvent } from "react";
import { api, errorMessage, type LoginResult } from "./api";
import { CarArt } from "./VehicleCard";

export function Auth({
  onLogin,
  notice,
}: {
  onLogin: (session: LoginResult) => void;
  notice: string;
}) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const credentials = {
      email: data.get("email"),
      password: data.get("password"),
    };
    setBusy(true);
    setError("");
    try {
      if (register)
        await api("/auth/register", null, {
          method: "POST",
          body: JSON.stringify(credentials),
        });
      onLogin(
        await api<LoginResult>("/auth/login", null, {
          method: "POST",
          body: JSON.stringify(credentials),
        }),
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-mark">m</span> motorroom
          <span className="brand-dot">.</span>
        </div>
        <div>
          <p className="eyebrow">THE NEXT CHAPTER STARTS HERE</p>
          <h1>
            Good cars.
            <br />
            Great possibilities.
          </h1>
          <p>
            A considered collection. A clearer view.
            <br />
            Your dealership, all in one place.
          </p>
          <CarArt category="Sedan" color="#c8d5b7" />
        </div>
        <span className="auth-foot">INVENTORY, BEAUTIFULLY SIMPLIFIED.</span>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <p className="eyebrow">WELCOME TO MOTORROOM</p>
          <h2>{register ? "Make yourself at home." : "Welcome back."}</h2>
          <p className="muted">
            {register
              ? "Create an account to explore and purchase vehicles."
              : "Sign in to explore your next vehicle."}
          </p>
          {(error || notice) && (
            <div className="alert error" role="alert">
              {error || notice}
            </div>
          )}
          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={register ? "new-password" : "current-password"}
                  placeholder={
                    register ? "At least 10 characters" : "Enter your password"
                  }
                  minLength={register ? 10 : 1}
                  maxLength={128}
                  required
                />
              </label>
              <button className="primary full" type="submit">
                {busy
                  ? "Please wait…"
                  : register
                    ? "Create account →"
                    : "Sign in →"}
              </button>
            </fieldset>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to Motorroom?"}{" "}
            <button
              disabled={busy}
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p className="auth-note">
            {register
              ? "New accounts have customer access."
              : "Administrator access is managed by your dealership."}
          </p>
        </div>
      </section>
    </main>
  );
}
