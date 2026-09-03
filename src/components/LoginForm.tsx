"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setMsg("가입 확인 메일을 보냈습니다. 메일의 링크를 누르면 로그인됩니다.");
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
      <div className="flex rounded-lg bg-gray-100 p-1 text-sm">
        {(["signin", "signup"] as const).map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 font-medium ${mode === m ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
          >
            {m === "signin" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>
      <div>
        <label className="label">이메일</label>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div>
        <label className="label">비밀번호 (6자 이상)</label>
        <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
      </div>
      {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{msg}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "처리 중..." : mode === "signin" ? "로그인" : "가입하기"}
      </button>
    </form>
  );
}
