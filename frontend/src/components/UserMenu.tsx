"use client";

import { useSession } from "@/lib/auth-client";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ChevronsUpDown } from "lucide-react";

export function UserMenu({ isSidebar = false }: { isSidebar?: boolean }) {
  const { data: session, isPending } = useSession();
  const { isSigningOut, handleSignOut } = useAuthActions();

  if (isPending || isSigningOut) {
    return <div className="h-8 w-8 animate-pulse bg-muted rounded-full mx-auto" />;
  }

  if (!session) {
    if (isSidebar) {
      return null;
    }
    return (
      <div className="flex items-center space-x-2">
        <Link href="/login">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Log in</Button>
        </Link>
        <Link href="/signup">
          <Button size="sm">Sign up</Button>
        </Link>
      </div>
    );
  }



  const userInitials = session.user.name
    ? session.user.name.substring(0, 2).toUpperCase()
    : "U";

  return (
    <DropdownMenu modal={false}>
      {isSidebar ? (
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenuTrigger render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={session.user.image || ""} alt={session.user.name} />
                  <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{session.user.name}</span>
                  <span className="truncate text-xs">{session.user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            } />
          </SidebarMenuItem>
        </SidebarMenu>
      ) : (
        <DropdownMenuTrigger className="relative h-8 w-8 rounded-full outline-none ring-primary focus-visible:ring-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user.image || ""} alt={session.user.name} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" align={isSidebar ? "start" : "end"} side="bottom" sideOffset={4}>
        <div className="px-2 py-1.5 text-sm font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-500 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
