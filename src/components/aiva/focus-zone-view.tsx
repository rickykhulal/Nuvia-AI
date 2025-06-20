
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Timer, Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const FOCUS_TYPES = [
  { id: 'study', label: 'Study', icon: '🎓' },
  { id: 'workout', label: 'Workout', icon: '🏋️' },
  { id: 'sleep', label: 'Sleep', icon: '😴' },
  { id: 'work', label: 'Work', icon: '💼' },
  { id: 'custom', label: 'Custom', icon: '✏️' },
];

const DURATION_PRESETS = [
  { label: '5 min', value: 5 * 60 },
  { label: '15 min', value: 15 * 60 },
  { label: '25 min', value: 25 * 60 }, // Pomodoro
  { label: '30 min', value: 30 * 60 },
  { label: '45 min', value: 45 * 60 },
  { label: '1 hour', value: 60 * 60 },
];

type TimerState = 'idle' | 'running' | 'paused' | 'finished';

export default function FocusZoneView() {
  const [focusType, setFocusType] = useState<string>(FOCUS_TYPES[0].id);
  const [customActivityName, setCustomActivityName] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(DURATION_PRESETS[2].value); // Default to 25 mins
  const [customDurationInput, setCustomDurationInput] = useState<string>('');
  
  const [timeLeft, setTimeLeft] = useState<number>(selectedDuration);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const LOCAL_STORAGE_KEYS = {
    FOCUS_TYPE: 'nuviaFocusZone_focusType',
    SELECTED_DURATION: 'nuviaFocusZone_selectedDuration',
  };

  useEffect(() => {
    const savedFocusType = localStorage.getItem(LOCAL_STORAGE_KEYS.FOCUS_TYPE);
    const savedDuration = localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_DURATION);

    if (savedFocusType && FOCUS_TYPES.find(ft => ft.id === savedFocusType)) {
      setFocusType(savedFocusType);
    }
    if (savedDuration) {
      const durationNum = parseInt(savedDuration, 10);
      if (!isNaN(durationNum) && durationNum > 0) {
        setSelectedDuration(durationNum);
        if (timerState === 'idle') { 
          setTimeLeft(durationNum);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FOCUS_TYPE, focusType);
  }, [focusType, LOCAL_STORAGE_KEYS.FOCUS_TYPE]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_DURATION, selectedDuration.toString());
     if (timerState === 'idle') { 
        setTimeLeft(selectedDuration);
    }
  }, [selectedDuration, timerState, LOCAL_STORAGE_KEYS.SELECTED_DURATION]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const cleanUpInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
// ✅ Safe sound playback function
const playFocusDoneSound = () => {
  if (audioRef.current) {
    const audio = audioRef.current;
    audio.muted = false;
    audio.currentTime = 0;

    const playAttempt = audio.play();

    if (playAttempt !== undefined) {
      playAttempt.catch((error) => {
        console.warn("Browser blocked autoplay:", error);

        toast({
          title: "Audio Blocked",
          description: "Browser blocked the sound. Please tap the screen or press Start again to enable audio.",
          variant: "destructive",
        });
      });
    }
  }
};

  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            cleanUpInterval();
            setTimerState('finished');
playFocusDoneSound();

            toast({
              title: "Focus Session Complete!",
              description: `${customActivityName || FOCUS_TYPES.find(f=>f.id === focusType)?.label || 'Your'} session has ended. Great job!`,
            });
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      cleanUpInterval();
    }
    return cleanUpInterval;
  }, [timerState, toast, customActivityName, focusType, cleanUpInterval]);


  const handleStart = () => {
    if (focusType === 'custom' && !customActivityName.trim()) {
      toast({ title: "Custom Activity Name Needed", description: "Please enter a name for your custom activity.", variant: "destructive" });
      return;
    }
    if (selectedDuration <= 0) {
        toast({ title: "Invalid Duration", description: "Please set a duration greater than 0.", variant: "destructive" });
        return;
    }

    if (audioRef.current) {
      const currentAudio = audioRef.current;
      currentAudio.muted = true; 
      currentAudio.play()
        .then(() => {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          currentAudio.muted = false; 
        })
        .catch(err => {
          console.warn("Audio priming/unlock attempt failed (this is sometimes expected):", err);
           if (currentAudio) currentAudio.muted = false; 
        });
    }

    setTimeLeft(selectedDuration); 
    setTimerState('running');
  };

  const handlePause = () => setTimerState('paused');
  const handleResume = () => setTimerState('running');

  const handleReset = () => {
    cleanUpInterval();
    setTimerState('idle');
    setTimeLeft(selectedDuration);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };
  
  const handleCustomDurationApply = () => {
    const newDurationMinutes = parseInt(customDurationInput, 10);
    if (!isNaN(newDurationMinutes) && newDurationMinutes > 0) {
      const newDurationSeconds = newDurationMinutes * 60;
      setSelectedDuration(newDurationSeconds);
      setCustomDurationInput(''); 
      toast({ title: "Duration Updated", description: `Timer set to ${newDurationMinutes} minutes.` });
    } else {
      toast({ title: "Invalid Custom Duration", description: "Please enter a valid number of minutes.", variant: "destructive" });
    }
  };

  const progressPercentage = timerState === 'idle' || timerState === 'finished' || selectedDuration === 0
    ? 0 
    : ((selectedDuration - timeLeft) / selectedDuration) * 100;
  
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const currentActivityDisplay = focusType === 'custom' 
    ? (customActivityName.trim() || "Custom Activity") 
    : (FOCUS_TYPES.find(f => f.id === focusType)?.label || "Focus Time");

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl bg-card/80 backdrop-blur-sm rounded-lg">
      <CardHeader className="text-center border-b">
        <CardTitle className="font-headline text-2xl text-foreground flex items-center justify-center gap-2">
          <Timer className="h-7 w-7 text-primary" />
          Focus Zone
        </CardTitle>
        <CardDescription>Minimize distractions and maximize productivity.</CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {timerState === 'idle' && (
          <>
            <div className="space-y-3">
              <Label className="text-base font-medium text-foreground">Choose Your Focus:</Label>
              <RadioGroup value={focusType} onValueChange={setFocusType} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FOCUS_TYPES.map((type) => (
                  <Label
                    key={type.id}
                    htmlFor={`focus-${type.id}`}
                    className={`flex flex-col items-center justify-center p-3 border rounded-md cursor-pointer transition-all 
                                ${focusType === type.id ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-2' : 'bg-muted/50 hover:bg-muted'}`}
                  >
                    <RadioGroupItem value={type.id} id={`focus-${type.id}`} className="sr-only" />
                    <span className="text-2xl mb-1">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </Label>
                ))}
              </RadioGroup>
              {focusType === 'custom' && (
                <Input
                  type="text"
                  placeholder="Enter custom activity name (e.g., Project X)"
                  value={customActivityName}
                  onChange={(e) => setCustomActivityName(e.target.value)}
                  className="mt-2 bg-input focus-visible:ring-accent"
                />
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium text-foreground">Set Duration:</Label>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={selectedDuration === preset.value ? 'default' : 'outline'}
                    onClick={() => { setSelectedDuration(preset.value); }}
                    className={`w-full ${selectedDuration === preset.value ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-muted/80'}`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Custom (minutes)"
                  value={customDurationInput}
                  onChange={(e) => setCustomDurationInput(e.target.value)}
                  min="1"
                  className="bg-input focus-visible:ring-accent"
                />
                <Button onClick={handleCustomDurationApply} variant="secondary" className="px-3">Set</Button>
              </div>
            </div>
          </>
        )}
        
        <div className="flex flex-col items-center justify-center space-y-3 my-4">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56">
            <svg className="w-full h-full" viewBox="0 0 200 200">
              <circle
                className="text-muted/30"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="100"
                cy="100"
              />
              <circle
                className="text-primary drop-shadow-md"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="100"
                cy="100"
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl font-bold text-foreground tabular-nums">
                {formatTime(timeLeft)}
              </span>
              {timerState !== 'idle' && (
                <span className="text-sm text-muted-foreground mt-1 text-center px-2 truncate max-w-[90%]">
                  {currentActivityDisplay}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {timerState === 'finished' && (
          <p className="text-center text-lg font-semibold text-green-600 dark:text-green-400">
            <CheckCircle2 className="inline-block mr-2 h-6 w-6" /> Session Complete!
          </p>
        )}
      </CardContent>

      <CardFooter className="border-t pt-6 flex flex-col sm:flex-row justify-center gap-3">
        {timerState === 'idle' && (
          <Button onClick={handleStart} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg">
            <Play className="h-5 w-5 mr-2" /> Start Focus
          </Button>
        )}
        {timerState === 'running' && (
          <Button onClick={handlePause} variant="outline" className="w-full sm:w-auto border-yellow-500 text-yellow-600 hover:bg-yellow-500/10 px-8 py-3 text-lg">
            <Pause className="h-5 w-5 mr-2" /> Pause
          </Button>
        )}
        {timerState === 'paused' && (
          <Button onClick={handleResume} className="w-full sm:w-auto bg-green-500 hover:bg-green-500/90 text-white px-8 py-3 text-lg">
            <Play className="h-5 w-5 mr-2" /> Resume
          </Button>
        )}
        {(timerState === 'running' || timerState === 'paused' || timerState === 'finished') && (
          <Button onClick={handleReset} variant="destructive" className="w-full sm:w-auto px-8 py-3 text-lg">
            <RotateCcw className="h-5 w-5 mr-2" /> Reset
          </Button>
        )}
      </CardFooter>

      <audio ref={audioRef} src="/sounds/new-alarm-sound.mp3" preload="auto"></audio>
    </Card>
  );
}
