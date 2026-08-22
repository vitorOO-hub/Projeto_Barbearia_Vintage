interface ToastItem {
  id: number;
  message: string;
  variant: "success" | "error";
}

export function Toast({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded px-4 py-2 text-sm text-white shadow-lg ${
            t.variant === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
