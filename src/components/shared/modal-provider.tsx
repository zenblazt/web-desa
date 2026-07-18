"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

type AlertOptions = {
  title?: string;
  description: string;
  confirmText?: string;
  variant?: "default" | "danger";
};

type ConfirmOptions = {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  /** Kalau diisi, user WAJIB ngetik teks ini persis sebelum tombol konfirmasi aktif (buat aksi berbahaya, mis. "Hapus Semua"). */
  typeToConfirm?: string;
};

type ModalState =
  | { kind: "alert"; options: AlertOptions; resolve: () => void }
  | { kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | null;

type ModalContextValue = {
  alert: (options: AlertOptions | string) => Promise<void>;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal harus dipakai di dalam <ModalProvider>");
  return ctx;
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>(null);
  const [typedText, setTypedText] = useState("");

  const alert = useCallback((options: AlertOptions | string) => {
    const opts = typeof options === "string" ? { description: options } : options;
    return new Promise<void>((resolve) => {
      setState({ kind: "alert", options: opts, resolve });
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts = typeof options === "string" ? { description: options } : options;
    setTypedText("");
    return new Promise<boolean>((resolve) => {
      setState({ kind: "confirm", options: opts, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    if (!state) return;
    if (state.kind === "alert") state.resolve();
    else state.resolve(result);
    setState(null);
    setTypedText("");
  };

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm]);

  const isDanger = state?.options.variant === "danger";
  const needsTyping =
    state?.kind === "confirm" && !!state.options.typeToConfirm;
  const typingOk =
    !needsTyping || (state?.kind === "confirm" && typedText === state.options.typeToConfirm);

  return (
    <ModalContext.Provider value={value}>
      {children}
      <Dialog.Root
        open={!!state}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content
            onEscapeKeyDown={(e) => {
              if (needsTyping) e.preventDefault();
            }}
            className="fixed left-1/2 top-1/2 z-[101] w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
          >
            {state && (
              <>
                <Dialog.Title className="text-base font-semibold">
                  {state.options.title ?? (state.kind === "alert" ? "Pemberitahuan" : "Konfirmasi")}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                  {state.options.description}
                </Dialog.Description>

                {state.kind === "confirm" && state.options.typeToConfirm && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Ketik <span className="font-mono font-semibold text-foreground">{state.options.typeToConfirm}</span> untuk melanjutkan:
                    </p>
                    <input
                      autoFocus
                      value={typedText}
                      onChange={(e) => setTypedText(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                      placeholder={state.options.typeToConfirm}
                    />
                  </div>
                )}

                <div className="mt-5 flex justify-end gap-2">
                  {state.kind === "confirm" && (
                    <button
                      type="button"
                      onClick={() => close(false)}
                      className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      {state.options.cancelText ?? "Batal"}
                    </button>
                  )}
                  <button
                    type="button"
                    autoFocus={state.kind === "alert"}
                    disabled={state.kind === "confirm" && !typingOk}
                    onClick={() => close(true)}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40",
                      isDanger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    {state.options.confirmText ?? (state.kind === "alert" ? "OK" : "Ya, lanjutkan")}
                  </button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ModalContext.Provider>
  );
}
