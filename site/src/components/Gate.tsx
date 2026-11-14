"use client";
// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
// Client-side gate in front of the dashboard. See src/lib/auth.ts for why this is not access control.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSignedIn } from "@/lib/auth";

export default function Gate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const signed = isSignedIn();
    setOk(signed);
    if (!signed) router.replace("/login/");
  }, [router]);
  if (ok) return <>{children}</>;
  return (
    <div className="mx-auto grid min-h-[100dvh] max-w-[1400px] grid-cols-1 items-center gap-10 px-4 md:grid-cols-2 md:px-10" aria-busy="true" aria-label="Checking your session">
      <div className="space-y-4"><div className="shimmer h-4 w-40 rounded" /><div className="shimmer h-14 w-full rounded-lg" /><div className="shimmer h-14 w-4/5 rounded-lg" /><div className="shimmer h-5 w-3/5 rounded" /></div>
      <div className="shimmer aspect-square w-full rounded-full opacity-40" />
    </div>
  );
}
