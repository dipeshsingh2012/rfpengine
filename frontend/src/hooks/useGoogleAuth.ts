import { useEffect, useState, useCallback } from "react";
import { GoogleUser } from "../types";
import { getApiBaseUrl } from "../utils/helpers";

const apiBaseUrl = getApiBaseUrl();
const STORAGE_KEY = "rfpengine_auth_user";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (momentListener?: any) => void;
        };
      };
    };
  }
}

export function useGoogleAuth(showToast?: (msg: string) => void) {
  const [user, setUser] = useState<GoogleUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [googleClientId, setGoogleClientId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setIsLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Verification failed" }));
          throw new Error(err.detail || "Google authentication failed");
        }
        const data = await res.json();
        const authedUser: GoogleUser = data.user;
        setUser(authedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authedUser));
        showToast?.(`Signed in as ${authedUser.name}`);
      } catch (err: any) {
        showToast?.(err.message || "Failed to authenticate with Google");
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/v1/auth/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.google_client_id) {
          setGoogleClientId(data.google_client_id);
          if (!document.getElementById("google-gsi-client")) {
            const script = document.createElement("script");
            script.id = "google-gsi-client";
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
          }
        }
      })
      .catch(() => {});
  }, []);

  const logout = useCallback(() => {
    fetch(`${apiBaseUrl}/api/v1/auth/logout`, { method: "POST" }).catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    showToast?.("Signed out");
  }, [showToast]);

  return {
    user,
    isAuthenticated: Boolean(user),
    googleClientId,
    isLoading,
    logout,
    handleCredentialResponse,
  };
}
