"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { Loader2, UtensilsCrossed } from "lucide-react";
import { useTheme } from "next-themes";
import { useActionState, useState } from "react";

import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/constants";

const initialState: LoginState = { error: null };

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  // Sin Turnstile configurado (desarrollo) se envía un token de relleno
  // que el servidor acepta solo fuera de producción.
  const [turnstileToken, setTurnstileToken] = useState(
    siteKey ? "" : "dev-bypass",
  );
  const { resolvedTheme } = useTheme();

  return (
    <Card className="w-full max-w-md border-none shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="space-y-3 text-center">
        <div
          aria-hidden="true"
          className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          <UtensilsCrossed className="size-7" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          {APP_NAME}
        </CardTitle>
        <CardDescription>
          Inicia sesión para acceder a vuestros rincones favoritos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="redirectTo" value={redirectTo ?? "/"} />
          <input type="hidden" name="turnstileToken" value={turnstileToken} />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              required
              aria-required="true"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              aria-required="true"
            />
          </div>

          {siteKey ? (
            <div className="flex justify-center">
              <Turnstile
                siteKey={siteKey}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
                options={{
                  theme: resolvedTheme === "dark" ? "dark" : "light",
                  language: "es",
                }}
              />
            </div>
          ) : (
            // Sin clave configurada (desarrollo local): token de relleno.
            <input type="hidden" name="turnstile-dev" value="dev" />
          )}

          {state.error && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || (Boolean(siteKey) && !turnstileToken)}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Entrando…
              </>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
