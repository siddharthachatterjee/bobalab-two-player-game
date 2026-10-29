import {
  usePlayer,
  usePlayers,
  useStage,
} from "@empirica/core/player/classic/react";
import React from "react";
import { ROLES } from "../../../shared/model.js";

export function Label({ children, className = "" }) {
  return (
    <span className={`font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted ${className}`}>
      {children}
    </span>
  );
}

export function PrimaryButton({ children, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-12 px-8 rounded-full bg-ink text-surface text-[15px] font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-faint"
    >
      {children}
    </button>
  );
}

export function Pending({ children }) {
  return (
    <div className="flex items-center gap-3 text-muted">
      <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
      <Label>{children}</Label>
    </div>
  );
}

export function useDay() {
  return useStage().get("day");
}

export function usePartner() {
  const player = usePlayer();
  return usePlayers().find((p) => p.id !== player.id);
}

// "Customers'" rather than "Customers's"
export const possessive = (name) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

export function roleInfo(role) {
  return ROLES[role] || { name: "Partner" };
}
