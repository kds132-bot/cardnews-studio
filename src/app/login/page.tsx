import LoginForm from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/projects";
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-2xl font-black text-gray-900">로그인</h1>
      <p className="mt-1 text-sm text-gray-600">이메일로 가입하면 카드뉴스 생성 기록이 저장됩니다.</p>
      <LoginForm next={next} />
    </div>
  );
}
