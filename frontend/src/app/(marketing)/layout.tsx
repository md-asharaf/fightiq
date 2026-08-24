import { Header } from "@/components/Header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header fullWidth={false} />
      <main className="flex-1 flex flex-col bg-background overflow-y-auto relative">
        {children}
      </main>
    </>
  );
}
