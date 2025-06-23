"use client";

import { useState, useEffect } from 'react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import SidebarNav from '@/components/aiva/sidebar-nav';
import ChatView from '@/components/aiva/chat-view';
import TasksView from '@/components/aiva/tasks-view';
import SummarizerView from '@/components/aiva/summarizer-view';
import AnalyzerView from '@/components/aiva/analyzer-view';
import PlayGameView from '@/components/aiva/play-game-view';
import ContentStudioView from '@/components/aiva/content-studio-view';
import AssignmentTrackerView from '@/components/aiva/assignment-tracker-view';
import FocusZoneView from '@/components/aiva/focus-zone-view';
import RoutineBuilderView from '@/components/aiva/routine-builder-view';
import { Bot, PanelLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeToggle } from '@/components/aiva/theme-toggle';

type ViewName = 'chat' | 'tasks' | 'summarizer' | 'analyzer' | 'contentStudio' | 'playgame' | 'assignmentTracker' | 'focusZone' | 'routineBuilder';

// Internal component to correctly handle mobile sidebar toggle using context
const MobileHeaderToggleButton = () => {
  const { toggleSidebar: contextToggleSidebar } = useSidebar();
  return (
    <Button variant="ghost" size="icon" onClick={contextToggleSidebar} className="h-9 w-9">
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};

export default function AppShell() {
  const [activeView, setActiveView] = useState<ViewName>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false); // For desktop
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      if (!isMobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    }
  }, [isMobile, isClient]);

  if (!isClient) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold font-headline text-foreground">Nuvia</h1>
              <p className="text-xs text-muted-foreground">Think Smarter. Work Faster.</p>
            </div>
          </div>
          <div className="h-9 w-9 bg-muted rounded-md animate-pulse" /> {/* Placeholder for ThemeToggle during SSR */}
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={!isMobile} open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-2">
            {isMobile && <MobileHeaderToggleButton />}
            <Bot className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold font-headline text-foreground">Nuvia</h1>
              <p className="text-xs text-muted-foreground">Think Smarter. Work Faster.</p>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1">
          <Sidebar
            variant="sidebar"
            collapsible={isMobile ? "offcanvas" : "icon"}
            className="border-r shadow-md data-[collapsible=icon]:bg-sidebar"
            style={{
              // @ts-ignore
              "--sidebar-width": "280px",
              "--sidebar-width-icon": "56px",
            }}
          >
            <SidebarContent className="p-0">
              <SidebarNav activeView={activeView} setActiveView={setActiveView} />
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="flex-1 overflow-y-auto bg-background">
            <main className="p-4 sm:p-6 lg:p-8">
              {activeView === 'chat' && <ChatView />}
              {activeView === 'tasks' && <TasksView />}
              {activeView === 'summarizer' && <SummarizerView />}
              {activeView === 'analyzer' && <AnalyzerView />}
              {activeView === 'contentStudio' && <ContentStudioView />}
              {activeView === 'playgame' && <PlayGameView />}
              {activeView === 'assignmentTracker' && <AssignmentTrackerView />}
              {activeView === 'focusZone' && <FocusZoneView />}
              {activeView === 'routineBuilder' && <RoutineBuilderView />}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
