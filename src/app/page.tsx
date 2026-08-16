import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import Login from "@/components/Login";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/command");
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
