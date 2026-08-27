import Link from "next/link";
import Image from "next/image";
import { NavLinks } from "@/app/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

export function Header({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-[2px] supports-[backdrop-filter]:bg-background/90">
      <div className={`flex h-16 items-center px-4 md:px-8 justify-between ${fullWidth ? 'w-full' : 'container mx-auto'}`}>
        <Link href="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
          <Image src="/favicon.ico" alt="FightIQ Logo" width={40} height={40} className="object-contain" />
        </Link>
        <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
          <NavLinks />
          <ThemeToggle />
          <UserMenu />
        </nav>
        <div className="md:hidden flex items-center space-x-4 text-sm font-medium">
          <NavLinks mobile={true} />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
