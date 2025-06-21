"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, ListChecks, FileText, ScanSearch, Bot, Gamepad2, BookOpenCheck, LogOut, UserCircle2, ClipboardCheck, TimerIcon, ClipboardList } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar, SidebarSeparator } from '@/components/ui/sidebar';
import { useToast } from "@/hooks/use-toast";
import { auth, signOut, onAuthStateChanged } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FeedbackButton from "@/components/feedback/FeedbackButton"; // ✅ Imported

type ViewName = 'chat' | 'tasks' | 'summarizer' | 'analyzer' | 'playgame' | 'contentStudio' | 'assignmentTracker' | 'focusZone' | 'routineBuilder';

interface SidebarNavProps {
  activeView: ViewName;
  setActiveView: Dispatch<SetStateAction<ViewName>>;
}

const navItems = [
  { name: 'Chat', icon: MessageSquare, view: 'chat' as ViewName, tooltip: "Natural Language Chat" },
  { name: 'Tasks', icon: ListChecks, view: 'tasks' as ViewName, tooltip: "Smart To-Do Assistant" },
  { name: 'Summarizer', icon: FileText, view: 'summarizer' as ViewName, tooltip: "Document Summarizer" },
  { name: 'Analyzer', icon: ScanSearch, view: 'analyzer' as ViewName, tooltip: "Image Analyzer" },
  { name: 'Content Studio', icon: BookOpenCheck, view: 'contentStudio' as ViewName, tooltip: "Smart Note Maker & Q&A" },
  { name: 'Assignment Tracker', icon: ClipboardCheck, view: 'assignmentTracker' as ViewName, tooltip: "AI Assignment Planner"},
  { name: 'Focus Zone', icon: TimerIcon, view: 'focusZone' as ViewName, tooltip: "Focus Timer with Alarm" },
  { name: 'Smart Routine', icon: ClipboardList, view: 'routineBuilder' as ViewName, tooltip: "Smart Routine Generator" },
  { name: 'Play Game', icon: Gamepad2, view: 'playgame' as ViewName, tooltip: "Play a Game with Nuvia" },
];

export default function SidebarNav({ activeView, setActiveView }: SidebarNavProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/auth');
      if (isMobile) {
        setOpenMobile(false);
      }
    } catch (error) {
      console.error("Error during logout: ", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive"});
    }
  };

  const handleViewChange = (view: ViewName) => {
    setActiveView(view);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length -1]) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={`flex h-full flex-col ${isMobile ? 'p-0' : 'p-2 pt-16'}`}>
      {isMobile && (
        <div className="flex items-center gap-2 p-4 border-b border-sidebar-border shadow-sm">
          <Bot className="h-7 w-7 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-xl font-semibold font-headline text-sidebar-foreground leading-tight">Nuvia</h1>
            <p className="text-xs text-muted-foreground leading-tight">Think Smarter. Work Faster.</p>
          </div>
        </div>
      )}
      <SidebarMenu className={`flex-1 space-y-1 ${isMobile ? 'p-2' : ''}`}>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              variant="default"
              size="default"
              isActive={activeView === item.view}
              onClick={() => handleViewChange(item.view)}
              className="justify-start w-full"
              tooltip={item.tooltip}
            >
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>

      <div className={`mt-auto ${isMobile ? 'p-2 border-t border-sidebar-border' : 'p-2'}`}>
        <SidebarSeparator className="my-2 group-data-[collapsible=icon]:hidden" />
        
        <div className="p-2 group-data-[collapsible=icon]:hidden flex items-center gap-3 mb-1">
           <Avatar className="h-9 w-9">
            {currentUser?.photoURL && <AvatarImage src={currentUser.photoURL} alt={currentUser.displayName || "User"} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {currentUser ? getInitials(currentUser.displayName || currentUser.email) : <UserCircle2 size={20}/>}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              {currentUser?.displayName || "Nuvia User"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {currentUser?.email}
            </span>
          </div>
        </div>

        <SidebarMenuItem>
          <SidebarMenuButton
            variant="default"
            size="default"
            onClick={handleLogout}
            className="justify-start w-full group-data-[collapsible=icon]:bg-destructive group-data-[collapsible=icon]:hover:bg-destructive/90 group-data-[collapsible=icon]:text-destructive-foreground"
            tooltip="Logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* ✅ Feedback Button added below logout */}
        <SidebarMenuItem>
          <FeedbackButton />
        </SidebarMenuItem>

        <div className={`flex flex-col items-center group-data-[collapsible=icon]:hidden mt-2 ${isMobile ? 'pt-2' : 'p-2'}`}>
          <Bot className="h-8 w-8 text-muted-foreground mb-1"/>
          <p className="text-xs text-muted-foreground">Nuvia v1.0</p>
        </div>
      </div>
    </div>
  );
}
