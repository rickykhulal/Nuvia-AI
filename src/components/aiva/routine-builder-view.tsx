
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Award, Sparkles, Play, Pause, RotateCcw, Download, ClipboardList } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import html2pdf from 'html2pdf.js';

interface Task {
  id: string;
  name: string;
  duration: number; // in seconds
  timerState: 'idle' | 'running' | 'paused';
  timeLeft: number;
}

interface Routine {
  id: string;
  name: string;
  tasks: Omit<Task, 'id' | 'timerState' | 'timeLeft'>[];
}

const ROUTINE_TEMPLATES: Routine[] = [
  {
    id: 'exam-mode', name: '📝 Exam Mode Focus', tasks: [
      { name: 'Eliminate distractions (phone off, clear desk)', duration: 5 * 60 },
      { name: 'Deep revision of core concepts (Chapter 1-2)', duration: 45 * 60 },
      { name: 'Short break (stretch, hydrate)', duration: 10 * 60 },
      { name: 'Practice mock test questions', duration: 60 * 60 },
      { name: 'Review mock test answers & identify weak areas', duration: 30 * 60 },
    ]
  },
  {
    id: 'fitness-sprint', name: '🏋️ Fitness Sprint', tasks: [
      { name: 'Warm-up routine (dynamic stretches)', duration: 10 * 60 },
      { name: 'High-Intensity Interval Training (HIIT)', duration: 20 * 60 },
      { name: 'Core strengthening exercises', duration: 15 * 60 },
      { name: 'Cool-down and stretching', duration: 10 * 60 },
    ]
  },
  {
    id: 'morning-kickstart', name: '☀️ Morning Kickstart', tasks: [
      { name: 'Hydrate (glass of water)', duration: 2 * 60 },
      { name: 'Mindful meditation or breathing', duration: 10 * 60 },
      { name: 'Plan top 3 priorities for the day', duration: 15 * 60 },
      { name: 'Light stretching or yoga', duration: 15 * 60 },
    ]
  },
  {
    id: 'deep-work-pomodoro', name: '🍅 Deep Work Pomodoro', tasks: [
      { name: 'Focused work session 1', duration: 25 * 60 },
      { name: 'Short break', duration: 5 * 60 },
      { name: 'Focused work session 2', duration: 25 * 60 },
      { name: 'Short break', duration: 5 * 60 },
      { name: 'Focused work session 3', duration: 25 * 60 },
      { name: 'Longer break', duration: 15 * 60 },
    ]
  }
];

const STREAK_LS_KEY = 'nuviaRoutineStreak';

export default function RoutineBuilderView() {
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(ROUTINE_TEMPLATES[0].id);
  const [currentRoutineTasks, setCurrentRoutineTasks] = useState<Task[]>([]);
  const [routineName, setRoutineName] = useState<string>(ROUTINE_TEMPLATES[0].name);
  const [streak, setStreak] = useState<number>(0);
  const timerIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const routineContainerRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    const savedStreak = localStorage.getItem(STREAK_LS_KEY);
    if (savedStreak) {
      setStreak(parseInt(savedStreak, 10));
    }
    // Load initial routine
    handleGenerateRoutine(ROUTINE_TEMPLATES[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(STREAK_LS_KEY, streak.toString());
  }, [streak]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleGenerateRoutine = (routineId: string) => {
    const template = ROUTINE_TEMPLATES.find(r => r.id === routineId);
    if (template) {
      setSelectedRoutineId(routineId);
      setRoutineName(template.name);
      setCurrentRoutineTasks(template.tasks.map((task, index) => ({
        ...task,
        id: `${routineId}-task-${index}-${Date.now()}`,
        timerState: 'idle',
        timeLeft: task.duration,
      })));
      // Clear all existing timers
      Object.values(timerIntervalsRef.current).forEach(clearInterval);
      timerIntervalsRef.current = {};
    }
  };
  
  const cleanUpTimer = useCallback((taskId: string) => {
    if (timerIntervalsRef.current[taskId]) {
      clearInterval(timerIntervalsRef.current[taskId]);
      delete timerIntervalsRef.current[taskId];
    }
  }, []);

  useEffect(() => {
    return () => { // Cleanup on component unmount
      Object.values(timerIntervalsRef.current).forEach(clearInterval);
    };
  }, []);

  const handleTimerControl = (taskId: string, action: 'start' | 'pause' | 'reset') => {
    setCurrentRoutineTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          cleanUpTimer(taskId); // Clear existing interval for this task before starting a new one or pausing/resetting

          if (action === 'start') {
            if (task.timeLeft <= 0) return { ...task, timerState: 'idle', timeLeft: task.duration }; // Reset if already finished
            
            timerIntervalsRef.current[taskId] = setInterval(() => {
              setCurrentRoutineTasks(current => current.map(t => {
                if (t.id === taskId && t.timerState === 'running') {
                  if (t.timeLeft <= 1) {
                    cleanUpTimer(taskId);
                    toast({ title: "Task Complete!", description: `"${t.name}" finished.` });
                    return { ...t, timeLeft: 0, timerState: 'idle' };
                  }
                  return { ...t, timeLeft: t.timeLeft - 1 };
                }
                return t;
              }));
            }, 1000);
            return { ...task, timerState: 'running' };
          }
          if (action === 'pause') {
            return { ...task, timerState: 'paused' };
          }
          if (action === 'reset') {
            return { ...task, timerState: 'idle', timeLeft: task.duration };
          }
        }
        return task;
      })
    );
  };

  const handleCompleteRoutine = () => {
    const allTasksImplicitlyCompleted = currentRoutineTasks.every(
      task => task.timerState === 'idle' && task.timeLeft === 0
    ); // Or some other logic for 'completion'
    
    if(currentRoutineTasks.length > 0) { // Ensure there are tasks to complete
        setStreak(prev => prev + 1);
        toast({ title: "Routine Completed!", description: `Great job! Your streak is now ${streak + 1}. ✨` });
        // Optionally reset tasks or suggest a new routine
        handleGenerateRoutine(selectedRoutineId); // Regenerate/reset current routine
    } else {
        toast({ title: "No Tasks", description: "Generate a routine first to complete it.", variant: "destructive" });
    }
  };

  const handleExportPdf = () => {
    if (!routineContainerRef.current || currentRoutineTasks.length === 0) {
      toast({ title: "No Routine", description: "Please generate a routine to export.", variant: "destructive" });
      return;
    }
    const element = routineContainerRef.current;
    const opt = {
      margin: 0.5,
      filename: `${routineName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_routine.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Temporarily make timer controls invisible for PDF
    const timerControls = element.querySelectorAll('.task-timer-controls');
    timerControls.forEach(control => (control as HTMLElement).style.display = 'none');

    html2pdf().from(element).set(opt).save().then(() => {
       timerControls.forEach(control => (control as HTMLElement).style.display = ''); // Restore visibility
       toast({ title: "PDF Exported!", description: "Your routine has been saved as a PDF." });
    }).catch(err => {
        timerControls.forEach(control => (control as HTMLElement).style.display = ''); // Restore visibility on error
        console.error("PDF export error:", err);
        toast({ title: "PDF Export Error", description: "Could not export routine to PDF.", variant: "destructive"});
    });
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 shadow-xl bg-card/80 backdrop-blur-sm rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Smart Routine Generator
          </CardTitle>
          <CardDescription>Select a routine type and Nuvia will craft a plan.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label htmlFor="routineType" className="text-sm font-medium text-foreground/80 block mb-1">Routine Type</label>
            <Select value={selectedRoutineId} onValueChange={handleGenerateRoutine}>
              <SelectTrigger className="w-full bg-input focus:ring-accent">
                <SelectValue placeholder="Select a routine type" />
              </SelectTrigger>
              <SelectContent>
                {ROUTINE_TEMPLATES.map(template => (
                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-md">
            <Award className="h-8 w-8 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-semibold text-foreground">Current Streak: {streak}</p>
            <p className="text-xs text-muted-foreground">Complete routines to build your streak!</p>
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-2">
            <Button onClick={handleCompleteRoutine} disabled={currentRoutineTasks.length === 0} className="w-full bg-green-600 hover:bg-green-700 text-white">
            Mark Routine as Complete & Boost Streak
          </Button>
          <Button onClick={handleExportPdf} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" /> Export Routine as PDF
          </Button>
        </CardFooter>
      </Card>

      <Card className="lg:col-span-2 shadow-xl min-h-[70vh] bg-card/80 backdrop-blur-sm rounded-lg flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Your Routine: {routineName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pt-6 overflow-hidden">
          {currentRoutineTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Select a routine type to generate tasks.</p>
          ) : (
            <ScrollArea className="h-full pr-4" ref={routineContainerRef}>
              <div className="space-y-3 p-1">
                {currentRoutineTasks.map((task) => (
                  <Card key={task.id} className="p-3 bg-background shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox id={`task-${task.id}`} 
                                  checked={task.timerState === 'idle' && task.timeLeft === 0 && task.duration > 0} 
                                  disabled // Visually 'checked' if timer ended, not user-interactive for completion
                                  className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                        <label htmlFor={`task-${task.id}`} className="text-sm font-medium text-foreground">{task.name}</label>
                      </div>
                       <div className="text-lg font-semibold text-primary tabular-nums">
                        {formatTime(task.timeLeft)}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2 items-center justify-end task-timer-controls">
                      {task.timerState !== 'running' && (
                        <Button variant="ghost" size="sm" onClick={() => handleTimerControl(task.id, 'start')} className="text-green-600 hover:text-green-700">
                          <Play className="h-4 w-4 mr-1" /> Start
                        </Button>
                      )}
                      {task.timerState === 'running' && (
                        <Button variant="ghost" size="sm" onClick={() => handleTimerControl(task.id, 'pause')} className="text-yellow-600 hover:text-yellow-700">
                          <Pause className="h-4 w-4 mr-1" /> Pause
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleTimerControl(task.id, 'reset')} className="text-red-600 hover:text-red-700">
                        <RotateCcw className="h-4 w-4 mr-1" /> Reset
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

