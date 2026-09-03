"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteProjectButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="text-xs text-red-500 hover:underline disabled:opacity-50"
      disabled={busy}
      onClick={async () => {
        if (!confirm("이 카드뉴스를 삭제할까요? 이미지도 함께 삭제됩니다.")) return;
        setBusy(true);
        await fetch(`/api/projects/${id}`, { method: "DELETE" });
        router.refresh();
        setBusy(false);
      }}
    >
      삭제
    </button>
  );
}
