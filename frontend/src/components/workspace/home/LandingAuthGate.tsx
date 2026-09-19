import React, { useEffect, useRef } from "react";
import { ShieldCheck, Sparkles, Lock, User } from "lucide-react";

interface LandingAuthGateProps {
  googleClientId?: string;
  onCredentialSuccess?: (res: { credential: string }) => void;
}

export const LandingAuthGate: React.FC<LandingAuthGateProps> = ({
  googleClientId,
  onCredentialSuccess = () => {},
}) => {
  const gateBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!googleClientId) return;
    let timer: any = null;
    const tryInit = () => {
      if (window.google?.accounts?.id && gateBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: onCredentialSuccess,
        });
        window.google.accounts.id.renderButton(gateBtnRef.current, {
          theme: "filled_blue",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 280,
        });
        if (timer) clearInterval(timer);
        return true;
      }
      return false;
    };

    if (!tryInit()) {
      timer = setInterval(tryInit, 200);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [googleClientId, onCredentialSuccess]);

  const handleManualPrompt = () => {
    if (window.google?.accounts?.id && googleClientId) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: onCredentialSuccess,
      });
      window.google.accounts.id.prompt();
    }
  };

  return (
    <div className="auth-gate-container">
      <div className="auth-gate-card">
        <div className="auth-gate-badge">
          <ShieldCheck size={16} /> Enterprise Access Control
        </div>
        <h1 className="auth-gate-title">Sign in to RFPEngine</h1>
        <p className="auth-gate-desc">
          Authenticate with your corporate Google Identity to access proposal drafting, SME review queues, and enterprise knowledge base retrieval.
        </p>

        <div className="auth-gate-action">
          <div ref={gateBtnRef} className="gate-google-slot" />
          <button className="primary-btn gate-fallback-btn" onClick={handleManualPrompt}>
            <User size={15} /> Sign in with Google
          </button>
        </div>

        <div className="auth-gate-features">
          <div className="gate-feature-item">
            <Sparkles size={16} color="var(--blue)" />
            <div>
              <strong>Grounded AI Synthesis</strong>
              <small>Sub-second RAG citations from verified documents</small>
            </div>
          </div>
          <div className="gate-feature-item">
            <Lock size={16} color="var(--navy)" />
            <div>
              <strong>Enterprise RBAC Governance</strong>
              <small>Waterfall & parallel SME reviews with executive sign-off</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
