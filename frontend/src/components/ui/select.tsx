import * as React from "react";

export function Select({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) {
  // Controlled <select>
  return (
    <select value={value} onChange={e => onValueChange(e.target.value)} className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-sm">
      {children}
    </select>
  );
}

export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  // visually wraps the trigger, not strictly necessary for this stub
  // className is accepted for API compatibility but not rendered in this simple implementation
  return <>{children}</>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  // empty stub for compatibility
  // placeholder is accepted for API compatibility but not rendered in this simple implementation
  return null;
}

export function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  // actual <option> content is rendered by child SelectItem
  // className is accepted for API compatibility but not rendered in this simple implementation
  return <>{children}</>;
}

export function SelectItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  // className is accepted for API compatibility but not applied to native option elements
  return <option value={value}>{children}</option>;
}