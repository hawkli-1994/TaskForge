"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AuthStatus({ initialUser }: { initialUser?: User | null }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(initialUser);

  useEffect(() => {
    // If the server could not provide a user (e.g. static generation), refresh
    // client-side.
    if (user === undefined) {
      apiFetch<User>("/api/users/me")
        .then(setUser)
        .catch(() => setUser(null));
    }
  }, [user]);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  if (user === undefined) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium text-gray-700 hover:text-indigo-600"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Register
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
        title={user.name}
      >
        {initials(user.name)}
      </div>
      <button
        onClick={logout}
        className="text-sm font-medium text-gray-500 hover:text-red-600"
      >
        Log out
      </button>
    </div>
  );
}
