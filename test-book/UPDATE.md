This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 설치된 패키지 목록 (AI 참고용)

의존성:

- @supabase/supabase-js ^2.52.0
- next ^15.1.6
- react ^19.0.0
- react-dom ^19.0.0

개발 의존성:

- @tailwindcss/postcss ^4.1.3
- @types/node ^22.13.4
- @types/react ^19.0.8
- eslint ^9.20.1
- eslint-config-next ^15.1.6
- postcss ^8.5.3
- tailwindcss ^4.1.3
- typescript ^5.7.3
- open ^8.4.0

## 보안 경고 메모

- `npm audit` 기준: `postcss` 취약점 2건(중간 심각도)이 `next` 의존성 경로에 남아 있음
- `npm audit fix`는 `next@9.3.3`로 다운그레이드가 필요해 실패함
- 팀프로젝트/vercel 배포 기준으로는 우선 유지함

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
