import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Chamada de Pacientes
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Sistema de gerenciamento de consultórios e chamadas
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/painel"
          className="flex h-14 w-64 items-center justify-center rounded-lg bg-zinc-900 px-6 text-lg font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Painel de Gerenciamento
        </Link>
        <Link
          href="/tv"
          className="flex h-14 w-64 items-center justify-center rounded-lg border border-zinc-300 px-6 text-lg font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Tela de Chamada (TV)
        </Link>
      </div>
    </div>
  );
}
