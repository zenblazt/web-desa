"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ---------------- Dialog shell ---------------- */

export function Dialog({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative z-10 w-full ${maxWidth} rounded-2xl bg-background p-5 shadow-lg`}>
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------------- Imperative hook: useModal() ----------------
 * Usage:
 *   const modal = useModal();
 *   await modal.confirm({ title, description });
 *   await modal.alert({ title, description });
 *   await modal.confirmText({ title, description, confirmWord: "HAPUS SEMUA" });
 *   {modal.element}
 * ------------------------------------------------------------- */

type ConfirmOpts = { title?: string; description?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
type AlertOpts = { title?: string; description?: string; okLabel?: string };
type ConfirmTextOpts = { title?: string; description?: string; confirmWord: string; confirmLabel?: string; cancelLabel?: string };

type State =
  | { kind: "none" }
  | { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: "alert"; opts: AlertOpts; resolve: (v: void) => void }
  | { kind: "confirmText"; opts: ConfirmTextOpts; resolve: (v: boolean) => void };

export function useModal() {
  const [state, setState] = React.useState<State>({ kind: "none" });
  const [textValue, setTextValue] = React.useState("");

  const close = React.useCallback(() => setState({ kind: "none" }), []);

  const confirm = React.useCallback((opts: ConfirmOpts = {}) => {
    return new Promise<boolean>((resolve) => setState({ kind: "confirm", opts, resolve }));
  }, []);

  const alert = React.useCallback((opts: AlertOpts = {}) => {
    return new Promise<void>((resolve) => setState({ kind: "alert", opts, resolve }));
  }, []);

  const confirmText = React.useCallback((opts: ConfirmTextOpts) => {
    setTextValue("");
    return new Promise<boolean>((resolve) => setState({ kind: "confirmText", opts, resolve }));
  }, []);

  const element = (() => {
    if (state.kind === "confirm") {
      const { opts, resolve } = state;
      return (
        <Dialog open title={opts.title ?? "Konfirmasi"} onClose={() => { resolve(false); close(); }}>
          {opts.description && <p className="mb-4 text-sm text-muted-foreground">{opts.description}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { resolve(false); close(); }}>
              {opts.cancelLabel ?? "Batal"}
            </Button>
            <Button
              variant={opts.danger ? "destructive" : "default"}
              onClick={() => { resolve(true); close(); }}
            >
              {opts.confirmLabel ?? "Ya"}
            </Button>
          </div>
        </Dialog>
      );
    }

    if (state.kind === "alert") {
      const { opts, resolve } = state;
      return (
        <Dialog open title={opts.title ?? "Info"} onClose={() => { resolve(); close(); }}>
          {opts.description && <p className="mb-4 text-sm text-muted-foreground">{opts.description}</p>}
          <div className="flex justify-end">
            <Button onClick={() => { resolve(); close(); }}>{opts.okLabel ?? "OK"}</Button>
          </div>
        </Dialog>
      );
    }

    if (state.kind === "confirmText") {
      const { opts, resolve } = state;
      const matched = textValue.trim() === opts.confirmWord;
      return (
        <Dialog open title={opts.title ?? "Konfirmasi"} onClose={() => { resolve(false); close(); }}>
          {opts.description && <p className="mb-3 text-sm text-muted-foreground">{opts.description}</p>}
          <p className="mb-2 text-xs text-muted-foreground">
            Ketik <span className="font-mono font-semibold text-foreground">{opts.confirmWord}</span> untuk melanjutkan:
          </p>
          <Input
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            className="mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { resolve(false); close(); }}>
              {opts.cancelLabel ?? "Batal"}
            </Button>
            <Button
              variant="destructive"
              disabled={!matched}
              onClick={() => { resolve(true); close(); }}
            >
              {opts.confirmLabel ?? "Hapus Semua"}
            </Button>
          </div>
        </Dialog>
      );
    }

    return null;
  })();

  return { confirm, alert, confirmText, element };
}
