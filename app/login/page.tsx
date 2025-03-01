// app/login/page.tsx
"use client"; // If you're in the App Router, remember to enable client components for forms

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const result = await signIn("credentials", {
        redirect: false,  // If false, we handle the response manually
        identifier,       // Must match your credentials fields
        password,
      });
      if (result?.error) {
        setError("Invalid credentials");
      } else {
        // Redirect user to dashboard or wherever
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("Something went wrong");
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username or Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Sign In</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
