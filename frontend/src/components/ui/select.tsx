import * as React from "react";

export function Select({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) {
  // Controlled <select>
  return (
    <select value={value} onChange={e => onValueChange(e.target.value)} className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-sm">
      {children}
    </select>
  );
}

export function SelectTrigger({ children }: { children: React.ReactNode }) {
  // visually wraps the trigger, not strictly necessary for this stub
  return <>{children}</>;
}

export function SelectValue() {
  // empty stub for compatibility
  return null;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  // actual <option> content is rendered by child SelectItem
  return <>{children}</>;
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}