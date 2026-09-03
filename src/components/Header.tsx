import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <span className="inline-block h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500" />
          카드뉴스 스튜디오
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link href="/new" className="btn-primary">새 카드뉴스</Link>
              <Link href="/projects" className="btn-secondary">내 기록</Link>
              <span className="hidden text-gray-500 sm:inline">{user.email}</span>
              <SignOutButton />
            </>
          ) : (
            <Link href="/login" className="btn-primary">로그인</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
