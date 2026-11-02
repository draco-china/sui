import { Button } from "@workspace/ui/components/button";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

/** Placeholder form for AuthLayout previews. */
export function SignInForm({ zh }: { zh: boolean }) {
  return (
    <form
      className="flex flex-col gap-4 rounded-3xl border bg-card p-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="space-y-1">
        <h2 className="font-semibold text-lg">{zh ? "登录" : "Sign in"}</h2>
        <p className="text-muted-foreground text-sm">
          {zh
            ? "输入邮箱和密码继续。"
            : "Enter your email and password to continue."}
        </p>
      </div>
      <Field>
        <FieldLabel htmlFor="auth-email">{zh ? "邮箱" : "Email"}</FieldLabel>
        <Input id="auth-email" type="email" placeholder="name@example.com" />
      </Field>
      <Field>
        <FieldLabel htmlFor="auth-password">
          {zh ? "密码" : "Password"}
        </FieldLabel>
        <Input id="auth-password" type="password" />
      </Field>
      <Button type="submit">{zh ? "登录" : "Sign in"}</Button>
    </form>
  );
}
