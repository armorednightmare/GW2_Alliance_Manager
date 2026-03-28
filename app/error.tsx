"use client";
import { useEffect } from "react";
import "./globals.css";

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="error-container">
      <h2>Ein Fehler ist aufgetreten!</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()} className="btn-retry">Erneut versuchen</button>
    </div>
  );
}
