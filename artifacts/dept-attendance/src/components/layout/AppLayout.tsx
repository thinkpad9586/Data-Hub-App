import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <div className="flex-1 p-8 container max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
