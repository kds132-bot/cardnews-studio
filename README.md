# 카드뉴스 스튜디오

브랜드 페르소나와 주제만 입력하면 카드별 글과 이미지를 자동 생성하고, 웹에서 편집해 PNG로 내려받는 카드뉴스 제작 웹앱입니다.

- 글: OpenAI Responses API (브랜드 말투 반영, JSON Schema 구조화 출력)
- 이미지: **OpenAI gpt-image-2** (`/v1/images/generations`, `/v1/images/edits`)
- 캐릭터 일관성: 업로드한 사진/캐릭터로 먼저 **캐릭터 시트**를 만들고, 모든 카드 이미지 생성 시 참조 이미지로 전달 (얼굴·의상·그림체 고정). 이전 카드 이미지도 스타일 앵커로 함께 참조합니다.
- 한글 텍스트: 이미지에는 글자를 생성하지 않고(프롬프트로 금지), 브라우저 Canvas에서 한글 웹폰트로 합성 → 원본 해상도 PNG / ZIP 다운로드
- 편집: 카드별 제목·본문·이미지 프롬프트·이미지 재생성·직접 업로드·순서(드래그)·디자인(레이아웃/글꼴/색/크기, 전체 또는 카드별)
- 로그인 + 생성 기록: Supabase Auth + Postgres(RLS) + Storage

## 로컬 실행

```bash
cp .env.example .env.local   # 값 채우기
npm install
npm run dev
```

## Supabase 설정

1. 새 프로젝트 생성 후 **SQL Editor**에서 `supabase/schema.sql` 실행 (테이블 + RLS + `cardnews` 공개 버킷 + 스토리지 정책)
2. **Authentication → URL Configuration**에서 Site URL을 배포 주소로, Redirect URLs에 `https://<도메인>/auth/callback` 추가
3. 프로젝트 URL과 anon(publishable) key를 환경변수에 입력

## 환경변수

| 이름 | 설명 |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI API 키 (필수) |
| `OPENAI_TEXT_MODEL` | 텍스트 모델 (기본 `gpt-5.6-terra`) |
| `OPENAI_IMAGE_MODEL` | 이미지 모델 (기본 `gpt-image-2`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

## 배포 (Vercel)

GitHub 저장소를 Vercel에 Import 하고 위 환경변수를 등록하면 됩니다. 이미지 생성 라우트는 `maxDuration = 300`으로 설정되어 있습니다.
