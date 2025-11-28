import * as React from "react";

export function Dialog({ open, onOpenChange: _onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  // Real dialogs use portals and focus management, but this stub will work for development!
  if (!open) return null;
  return <div className="fixed inset-0 flex items-center justify-center z-50">{children}</div>;
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-background rounded-lg shadow-xl ${className}`}>{children}</div>;
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="pb-2 border-b border-gray-700">{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold">{children}</h2>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="pt-2 flex justify-end gap-2">{children}</div>;
}