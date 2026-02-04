import React from "react";
import type { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AppLayoutProps {
  children?: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen overflow-hidden">
      <main className="h-full overflow-hidden">
        <ScrollArea className="h-full">
          <div className="px-[32px] py-[48px] min-h-screen">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
