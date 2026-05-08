import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20">
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-neutral-500">
        Vanilla module framework
      </p>
      <h1 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-normal sm:text-7xl">
        WebX Documentation
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600 dark:text-neutral-300">
        เอกสารสำหรับสร้าง component, reactive state, props ด้วย Zod, directive, control flow,
        scoped style, store และ CFX/NUI integration ใน WebX
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/docs"
          className="inline-flex h-11 items-center justify-center border border-neutral-950 bg-neutral-950 px-5 text-sm font-bold text-white transition hover:bg-white hover:text-neutral-950 dark:border-white dark:bg-white dark:text-black dark:hover:bg-black dark:hover:text-white"
        >
          อ่านเอกสาร
        </Link>
        <Link
          href="/docs/getting-started"
          className="inline-flex h-11 items-center justify-center border border-neutral-300 px-5 text-sm font-bold transition hover:border-neutral-950 dark:border-neutral-700 dark:hover:border-white"
        >
          เริ่มติดตั้ง
        </Link>
      </div>
    </div>
  );
}
