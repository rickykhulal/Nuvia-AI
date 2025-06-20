
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { smartTaskCreation, type SmartTaskCreationInput, type SmartTaskCreationOutput } from '@/ai/flows/smart-task-creation';
import { ListChecks, Sparkles, PlusCircle, Trash2, Loader2, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import { format as formatDateFns } from 'date-fns';

interface TaskItem {
  id: string;
  text: string;
  deadline?: string;
  completed: boolean;
}

export default function TasksView() {
  const [taskRequest, setTaskRequest] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const { toast } = useToast();

  const handleSmartCreateTasks = async () => {
    if (!taskRequest.trim()) {
      toast({ title: "Input Required", description: "Please enter a task request.", variant: "destructive" });
      return;
    }
    setIsLoadingAi(true);
    try {
      const currentDate = formatDateFns(new Date(), "MMMM d, yyyy");
      const input: SmartTaskCreationInput = { request: taskRequest, currentDate };
      const result: SmartTaskCreationOutput = await smartTaskCreation(input);
      const newAiTasks: TaskItem[] = result.map((t, index) => ({
        id: `ai-${Date.now()}-${index}`,
        text: t.task,
        deadline: t.deadline,
        completed: false,
      }));
      setTasks(prev => [...prev, ...newAiTasks]);
      setTaskRequest('');
      toast({ title: "Tasks Created", description: "Nuvia has generated new tasks for you." });
    } catch (error) {
      console.error("Error creating smart tasks:", error);
      toast({ title: "Error", description: "Failed to create tasks with AI. Please try again.", variant: "destructive" });
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: TaskItem = {
      id: `manual-${Date.now()}`,
      text: newTaskText,
      completed: false,
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskText('');
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks(prev => prev.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const handleDownloadPdf = () => {
    if (tasks.length === 0) {
      toast({
        title: "No Tasks",
        description: "Your to-do list is empty. Nothing to download.",
        variant: "default",
      });
      return;
    }

    const pdf = new jsPDF();
    const today = new Date();
    const dateStr = formatDateFns(today, "yyyy-MM-dd");
    const fileName = `nuvia-todo-list-${dateStr}.pdf`;

    let yPos = 20;
    const margin = 15;
    const pageWidth = pdf.internal.pageSize.width;
    // const contentWidth = pageWidth - 2 * margin;

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("Nuvia To-Do List", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Generated on: ${formatDateFns(today, "MMMM d, yyyy")}`, margin, yPos);
    yPos += 10;

    pdf.setLineWidth(0.2);
    pdf.line(margin, yPos, pageWidth - margin, yPos); 
    yPos += 8;

    tasks.forEach((task) => {
      if (yPos > pdf.internal.pageSize.height - 30) { 
        pdf.addPage();
        yPos = 20;
        pdf.setLineWidth(0.2);
        pdf.line(margin, yPos - 2, pageWidth - margin, yPos - 2); 
        yPos += 8;
      }

      const checkboxSymbol = task.completed ? "[x]" : "[ ]";
      const taskTextContent = `${checkboxSymbol} ${task.text}`;
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      
      const taskLines = pdf.splitTextToSize(taskTextContent, pageWidth - (2 * margin) - 5); // -5 for a bit of padding
      pdf.text(taskLines, margin, yPos);
      yPos += (taskLines.length * 6); 
      
      if (task.deadline) {
          if (yPos > pdf.internal.pageSize.height - 20) { 
               pdf.addPage(); yPos = 20;
          }
          pdf.setFontSize(10);
          pdf.setTextColor(128, 128, 128); // Grey color for deadline
          pdf.text(`Due: ${task.deadline}`, margin + 5, yPos); // Indent deadline
          pdf.setTextColor(0, 0, 0); // Reset color to black
          yPos += 6; 
      }
      yPos += 3; // Space between tasks
    });

    pdf.save(fileName);
    toast({
      title: "PDF Downloaded",
      description: `${fileName} has been saved.`,
    });
  };


  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-xl bg-card/80 backdrop-blur-sm rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-lg text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Task Creator
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Describe what you need to do (e.g., "Plan a birthday party for next month" or "Write a 10-page research paper in 7 days"), and Nuvia will break it down into manageable tasks.
          </p>
          <Textarea
            placeholder="e.g., Launch a new marketing campaign by end of quarter"
            value={taskRequest}
            onChange={(e) => setTaskRequest(e.target.value)}
            rows={3}
            className="bg-input focus-visible:ring-accent"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSmartCreateTasks} disabled={isLoadingAi} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoadingAi ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Generate Tasks with AI
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-xl h-auto max-h-[70vh] md:h-auto md:max-h-[calc(100vh-16rem)] flex flex-col bg-card/80 backdrop-blur-sm rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-lg text-foreground flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            My To-Do List
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Add a new task manually"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
              className="flex-1 bg-input focus-visible:ring-accent"
            />
            <Button onClick={handleAddTask} variant="outline" size="icon" className="border-primary text-primary hover:bg-primary/10">
              <PlusCircle className="h-5 w-5" />
              <span className="sr-only">Add Task</span>
            </Button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tasks yet. Add some or use the AI creator!</p>
          ) : (
            <ScrollArea className="h-[calc(100%-6.5rem)] pr-3"> {/* Adjusted height for download button */}
              <ul className="space-y-3">
                {tasks.map(task => (
                  <li key={task.id} className="flex items-center justify-between p-3 rounded-md bg-background shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`task-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={() => toggleTaskCompletion(task.id)}
                        className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label
                        htmlFor={`task-${task.id}`}
                        className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                      >
                        {task.text}
                        {task.deadline && (
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${task.completed ? 'bg-muted text-muted-foreground' : 'bg-accent text-accent-foreground'}`}>
                            {task.deadline}
                          </span>
                        )}
                      </label>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete Task</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4">
            <Button onClick={handleDownloadPdf} disabled={tasks.length === 0} className="w-full">
                <Download className="h-5 w-5 mr-2" />
                Download List as PDF
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

