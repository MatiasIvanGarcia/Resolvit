import React from "react";

export function useToast() {
  const [toast, setToast] = React.useState<{ open: boolean; text: string }>({ open: false, text: "" });
  const timerRef = React.useRef<number | null>(null);

  function showToast(text: string) {
    setToast({ open: true, text });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setToast((t) => ({ ...t, open: false }));
    }, 2200);
  }

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { toast, showToast };
}