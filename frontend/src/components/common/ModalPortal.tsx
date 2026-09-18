import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export interface ModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  overlayClassName?: string;
  cardClassName?: string;
  ariaLabel?: string;
  role?: string;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({
  isOpen,
  onClose,
  children,
  overlayClassName = "modal-backdrop",
  cardClassName = "modal-card",
  ariaLabel,
  role = "dialog",
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      className={overlayClassName}
      onClick={onClose}
      role={role}
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className={cardClassName} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(content, document.body);
  }

  return content;
};

