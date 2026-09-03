import CreateForm from "@/components/CreateForm";

export default function NewPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-black text-gray-900">새 카드뉴스 만들기</h1>
      <p className="mt-1 text-sm text-gray-600">브랜드 페르소나와 주제를 입력하면 카드별 글과 이미지를 자동으로 생성합니다.</p>
      <CreateForm />
    </div>
  );
}
