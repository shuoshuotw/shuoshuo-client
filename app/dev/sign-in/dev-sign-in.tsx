"use client";

import { useState } from "react";
import { browserAuth } from "@/lib/api/browser";

export function DevSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const auth = await browserAuth();
    const { error: failure } = await auth.signInWithPassword({ email, password });
    if (failure) setError(failure.message);
    else location.assign("/me");
  };

  return (
    <main className="dev-page">
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Email
          <input className="dev-input" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input className="dev-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit" className="button">
          Sign in
        </button>
        <p role="alert">{error}</p>
      </form>
    </main>
  );
}
