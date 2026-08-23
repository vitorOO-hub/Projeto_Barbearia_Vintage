interface ToastItem {
  id: number;
  message: string;
  variant: "success" | "error";
}

export function Toast({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={t.variant === "success" ? "toast-success" : "toast-error"}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
