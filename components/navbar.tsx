"use client";

import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@components/ui/button";
import { signOut } from "next-auth/react";
import { useUser } from "@/contexts/usercontext";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";

export function Navbar() {
  const { user, loading } = useUser();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };
console.log(user);
  // If the user data is still loading, you can return a skeleton or null
  if (loading) {
    return (
      <header className="flex h-16 w-full items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-2">Loading...</div>
      </header>
    );
  }

  return (
    <header className="flex h-16 w-full items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        {/* You can add additional left-side navbar content here */}
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            3
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-1 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.picture || ""} alt={user?.name || "User"} />
                <AvatarFallback>{user?.name ? user.name.substring(0, 1).toUpperCase() : "U"}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium">{user?.name || "Guest"}</span>
                <span className="text-xs text-muted-foreground">{user?.email || "guest@example.com"}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.picture || ""} alt={user?.name || "User"} />
                <AvatarFallback>{user?.name ? user.name.substring(0, 1).toUpperCase() : "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name || "Guest"}</span>
                <span className="text-xs text-muted-foreground">{user?.email || "guest@example.com"}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <Link href={`/profile`}>
            <DropdownMenuItem>
              <span>My Profile</span>
            </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
