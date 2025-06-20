
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck, Sparkles, CalendarIcon, Download, Loader2, BookText } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import { 
  db, 
  auth, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  doc,
  updateDoc,
  // Removed query, where, getDocs, orderBy as they are not used for loading existing plans yet
} from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { generateAssignmentPlan, type GenerateAssignmentPlanInput } from '@/ai/flows/generate-assignment-plan-flow';

interface PlanItem {
  id: string; // Unique ID for React key, e.g., line index or hash
  type: 'h2' | 'h3' | 'bold' | 'task' | 'separator' | 'text';
  text: string;
  completed?: boolean;
  originalLine: string; // To reconstruct the markdown
}

export default function AssignmentTrackerView() {
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  
  const [aiGeneratedPlanText, setAiGeneratedPlanText] = useState<string | null>(null);
  const [interactivePlanItems, setInteractivePlanItems] = useState<PlanItem[]>([]);

  const [currentSavedAssignmentId, setCurrentSavedAssignmentId] = useState<string | null>(null);
  const [currentSavedAssignmentTitle, setCurrentSavedAssignmentTitle] = useState<string | null>(null);
  const [currentSavedAssignmentDeadline, setCurrentSavedAssignmentDeadline] = useState<Timestamp | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setAssignmentTitle('');
        setDeadline(undefined);
        setAiGeneratedPlanText(null);
        setInteractivePlanItems([]);
        setCurrentSavedAssignmentId(null);
        setCurrentSavedAssignmentTitle(null);
        setCurrentSavedAssignmentDeadline(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const parseAndSetInteractivePlan = useCallback((markdownText: string | null) => {
    if (!markdownText) {
      setInteractivePlanItems([]);
      return;
    }
    const lines = markdownText.split('\n');
    const items: PlanItem[] = lines.map((line, index) => {
      const id = `item-${index}-${Date.now()}`; // Simple unique ID
      if (line.startsWith('## ')) return { id, type: 'h2', text: line.substring(3).trim(), originalLine: line };
      if (line.startsWith('### ')) return { id, type: 'h3', text: line.substring(4).trim(), originalLine: line };
      if (line.startsWith('**Goal:**')) return { id, type: 'bold', text: line.substring(8).trim(), originalLine: line };
      if (line.startsWith('- [ ] ')) return { id, type: 'task', text: line.substring(6).trim(), completed: false, originalLine: line };
      if (line.startsWith('- [x] ')) return { id, type: 'task', text: line.substring(6).trim(), completed: true, originalLine: line };
      if (line.trim() === '---') return { id, type: 'separator', text: '', originalLine: line };
      // For Today's Date and Deadline lines that start with **
      if (line.startsWith('**')) return {id, type: 'bold', text: line.replace(/\*\*/g, '').trim(), originalLine: line};
      return { id, type: 'text', text: line.trim(), originalLine: line };
    });
    setInteractivePlanItems(items);
  }, []);

  useEffect(() => {
    parseAndSetInteractivePlan(aiGeneratedPlanText);
  }, [aiGeneratedPlanText, parseAndSetInteractivePlan]);


  const handleCreateAssignmentPlan = async () => {
    if (!currentUser) {
      toast({ title: "Not Authenticated", description: "You must be logged in to create assignments.", variant: "destructive" });
      return;
    }
    if (!assignmentTitle.trim()) {
      toast({ title: "Missing Title", description: "Please enter a title for your assignment.", variant: "destructive" });
      return;
    }
    if (!deadline) {
      toast({ title: "Missing Deadline", description: "Please select a deadline for your assignment.", variant: "destructive" });
      return;
    }

    const today = startOfDay(new Date());
    const selectedDeadline = startOfDay(deadline);

    if (selectedDeadline <= today) {
      toast({ title: "Invalid Deadline", description: "Please select a deadline that is after today.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    setAiGeneratedPlanText(null);
    setInteractivePlanItems([]);
    setCurrentSavedAssignmentId(null);

    try {
      const formattedDeadline = format(selectedDeadline, "MMMM d, yyyy");
      const formattedCurrentDate = format(today, "MMMM d, yyyy");

      const aiInput: GenerateAssignmentPlanInput = {
        assignmentTopic: assignmentTitle,
        deadline: formattedDeadline,
        currentDate: formattedCurrentDate,
      };
      
      const result = await generateAssignmentPlan(aiInput);
      setAiGeneratedPlanText(result.plan); 
      
      const newAssignmentData = {
        userId: currentUser.uid,
        title: assignmentTitle,
        deadline: Timestamp.fromDate(selectedDeadline),
        aiGeneratedPlan: result.plan, // Save the raw Markdown
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "assignments"), newAssignmentData);
      setCurrentSavedAssignmentId(docRef.id);
      setCurrentSavedAssignmentTitle(assignmentTitle);
      setCurrentSavedAssignmentDeadline(Timestamp.fromDate(selectedDeadline));

      toast({ title: "Assignment Plan Created!", description: "Nuvia has generated a detailed plan for you." });
    } catch (error: any) {
      console.error("Error creating AI assignment plan:", error);
      let errorMessage = "Failed to generate or save the assignment plan. Please try again.";
       if (error.message && error.message.includes("quota")) {
        errorMessage = "AI processing quota may have been exceeded. Please try again later.";
      } else if (error.code === 'permission-denied') {
        errorMessage = "Permission denied. Please check your Firestore security rules to allow creating documents in 'assignments'.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ title: "Creation Error", description: errorMessage, variant: "destructive" });
      setAiGeneratedPlanText(null); // Clear plan on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTask = async (itemId: string) => {
    if (!currentSavedAssignmentId || !currentUser) return;

    const updatedItems = interactivePlanItems.map(item => {
      if (item.id === itemId && item.type === 'task') {
        return { ...item, completed: !item.completed };
      }
      return item;
    });
    setInteractivePlanItems(updatedItems); // Optimistic UI update

    // Reconstruct the Markdown string
    const newMarkdownPlan = updatedItems.map(item => {
      if (item.type === 'task') {
        return `- [${item.completed ? 'x' : ' '}] ${item.text}`;
      }
      return item.originalLine; // Use original line for non-task items to preserve formatting
    }).join('\n');

    setAiGeneratedPlanText(newMarkdownPlan); // Update the raw text state as well

    try {
      const assignmentRef = doc(db, "assignments", currentSavedAssignmentId);
      await updateDoc(assignmentRef, {
        aiGeneratedPlan: newMarkdownPlan
      });
      toast({ title: "Task Updated", description: "Your progress has been saved." });
    } catch (error) {
      console.error("Error updating task in Firestore:", error);
      toast({ title: "Update Failed", description: "Could not save task update. Please try again.", variant: "destructive" });
      // Revert optimistic update if needed, though for simplicity, we're not doing it here.
      // A more robust solution would refetch or revert.
    }
  };

  const handleDownloadPdf = () => {
    if (!aiGeneratedPlanText || !currentSavedAssignmentTitle || !currentSavedAssignmentDeadline) {
        toast({ title: "No Plan to Download", description: "Please generate an assignment plan first.", variant: "destructive" });
        return;
    }

    const pdf = new jsPDF();
    let yPos = 15;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 15;
    const maxWidth = pdf.internal.pageSize.width - margin * 2;
    
    pdf.setFontSize(16); // Main title
    pdf.setFont("helvetica", "bold");
    const titleText = `Assignment Plan: ${currentSavedAssignmentTitle}`;
    const titleLines = pdf.splitTextToSize(titleText, maxWidth);
    pdf.text(titleLines, margin, yPos);
    yPos += titleLines.length * 7 + 5; // Adjusted spacing

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    
    interactivePlanItems.forEach(item => {
        if (yPos > pageHeight - margin - 10) { // Check for page break
            pdf.addPage();
            yPos = margin;
        }
        let textToRender = item.text;
        let leftOffset = margin;

        switch(item.type) {
            case 'h2':
                pdf.setFontSize(14);
                pdf.setFont("helvetica", "bold");
                textToRender = item.text; // Already without hashes
                break;
            case 'h3':
                pdf.setFontSize(12);
                pdf.setFont("helvetica", "bold");
                textToRender = item.text; // Already without hashes
                break;
            case 'bold': // For Goal, Today's Date, Deadline
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "bold");
                textToRender = (item.originalLine.startsWith('**Goal:**') ? "Goal: " : "") + item.text;
                break;
            case 'task':
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                textToRender = `[${item.completed ? 'X' : ' '}] ${item.text}`;
                leftOffset = margin + 5; // Indent tasks
                break;
            case 'separator':
                pdf.setLineWidth(0.2);
                pdf.line(margin, yPos + 1, maxWidth + margin, yPos + 1);
                yPos += 3;
                return; // Skip text rendering for separator
            case 'text':
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                break;
            default:
                return; // Skip unknown types
        }
        
        const lines = pdf.splitTextToSize(textToRender, maxWidth - (leftOffset - margin));
        pdf.text(lines, leftOffset, yPos);
        yPos += lines.length * 5 + (item.type === 'h2' || item.type === 'h3' ? 2 : 0);

        // Reset to default after specific styling
        if (item.type === 'h2' || item.type === 'h3' || item.type === 'bold') {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
        }
    });
    
    const safeFileNameBase = (currentSavedAssignmentTitle).replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    const dateString = new Date().toISOString().split('T')[0];
    pdf.save(`assignment_plan_${safeFileNameBase}_${dateString}.pdf`);
    toast({ title: "PDF Ready!", description: "Your assignment plan PDF has been downloaded." });
  };


  const renderPlanItem = (item: PlanItem) => {
    switch (item.type) {
      case 'h2':
        return <h2 className="text-xl font-semibold mt-3 mb-2 text-foreground">{item.text}</h2>;
      case 'h3':
        return <h3 className="text-lg font-semibold mt-2 mb-1 text-primary">{item.text}</h3>;
      case 'bold':
        return <p className="font-semibold text-foreground/90 my-1">{item.originalLine.startsWith('**Goal:**') ? 'Goal: ' : ''}{item.text}</p>;
      case 'task':
        return (
          <div key={item.id} className="flex items-center space-x-2 my-1 ml-1">
            <Checkbox
              id={item.id}
              checked={item.completed}
              onCheckedChange={() => handleToggleTask(item.id)}
              disabled={!currentSavedAssignmentId || isLoading}
            />
            <label
              htmlFor={item.id}
              className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground/90'}`}
            >
              {item.text}
            </label>
          </div>
        );
      case 'separator':
        return <hr className="my-3 border-border" />;
      case 'text':
        // Only render non-empty text lines that are not part of other structures
        if (item.text) return <p className="text-sm text-foreground/80 my-0.5">{item.text}</p>;
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-0">
      <Card className="lg:col-span-1 shadow-xl bg-card/80 backdrop-blur-sm rounded-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            New AI Assignment Plan
          </CardTitle>
          <CardDescription>Enter assignment details. Nuvia will generate a comprehensive plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="assignmentTitleInput" className="text-sm font-medium text-foreground/80">Assignment Title</label>
            <Input id="assignmentTitleInput" placeholder="e.g., The Impact of AI on Modern Art" value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} className="mt-1 bg-input focus-visible:ring-accent"/>
          </div>
          <div>
            <label htmlFor="deadline" className="text-sm font-medium text-foreground/80 block mb-1">Final Deadline</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal bg-input hover:bg-muted/50 border-border hover:border-primary"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  initialFocus
                  disabled={(date) => date <= startOfDay(new Date())} 
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-3">
          <Button onClick={handleCreateAssignmentPlan} disabled={isLoading || !currentUser} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Create AI Assignment Plan
          </Button>
           <Button 
            variant="outline" 
            onClick={handleDownloadPdf} 
            disabled={!aiGeneratedPlanText || isLoading} 
            className="w-full"
           >
            <Download className="h-5 w-5 mr-2" />
            Download Current Plan as PDF
          </Button>
        </CardFooter>
      </Card>

      <Card className="lg:col-span-2 shadow-xl min-h-[60vh] bg-card/80 backdrop-blur-sm rounded-lg flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2">
             <BookText className="h-6 w-6 text-primary" />
            {currentSavedAssignmentTitle ? `Plan: ${currentSavedAssignmentTitle}` : "Your AI-Generated Assignment Plan"}
          </CardTitle>
           {currentSavedAssignmentDeadline && (
            <CardDescription>
                Deadline: {format(currentSavedAssignmentDeadline.toDate(), 'PPP')}
            </CardDescription>
           )}
        </CardHeader>
        <CardContent className="flex-1 space-y-2 overflow-hidden pt-3">
           {isLoading && !aiGeneratedPlanText && ( // Show this loader only when fetching AI plan initially
                <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                    <p className="text-muted-foreground">Nuvia is crafting your assignment plan...</p>
                </div>
            )}
            {!isLoading && interactivePlanItems.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Enter an assignment title and deadline, then click "Create AI Assignment Plan".</p>
                <p className="text-sm text-muted-foreground/80">Nuvia will generate a detailed plan here.</p>
              </div>
            )}
            
            {interactivePlanItems.length > 0 && (
              <ScrollArea className="h-full pr-4">
                <div className="p-1">
                  {interactivePlanItems.map(item => (
                    <div key={item.id}>
                      {renderPlanItem(item)}
                    </div>
                  ))}
                   {isLoading && aiGeneratedPlanText && ( // Show small loader for updates
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                         <p className="ml-2 text-sm text-muted-foreground">Updating...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
    
