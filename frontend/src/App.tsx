import React from "react";
import { SidebarProvider, Sidebar, SidebarHeader } from "./components/ui/sidebar";
import { SidebarHeaderContent } from "./components/SidebarHeaderContent";
import { Chat } from "./components/Chat";

const App: React.FC = () => {
  return (
    <SidebarProvider className="flex">
      <Sidebar className="border-r border-[#2c2c2c]">
        <SidebarHeader className="bg-[#191919]">
          <SidebarHeaderContent />
        </SidebarHeader>
      </Sidebar>
      <main className="dark relative bg-[#121212] text-foreground flex-1 flex flex-col overflow-hidden">
        <Chat />
      </main>
    </SidebarProvider>
  );
};

export default App;
