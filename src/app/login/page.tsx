import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a los rincones gastronómicos de Álvaro y Mariano",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const redirectTo =
    typeof searchParams.redirectTo === "string"
      ? searchParams.redirectTo
      : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <LoginForm redirectTo={redirectTo} />
    </main>
  );
}
