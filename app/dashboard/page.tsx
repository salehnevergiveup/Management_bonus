"use client"; 
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session) {
    // Not authenticated, redirect or show a message
    router.push("/login");
    return null;
  }

  // If session exists, show the dashboard
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {session.user?.name} {session.user?.permissions}!</p>
      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}
