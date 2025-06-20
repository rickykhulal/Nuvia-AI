
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getRiddleGame, type GetRiddleOutput } from '@/ai/flows/get-riddle-flow'; // TOTAL_RIDDLES_COUNT removed
import { Loader2, Gamepad2, Lightbulb, Send, Brain, HelpCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type GameState = "idle" | "loading" | "playing" | "answered";

interface Riddle extends GetRiddleOutput {}

// Helper function to normalize answers by removing leading articles
const normalizeAnswer = (answer: string): string => {
  const lowerAnswer = answer.toLowerCase().trim();
  const articles = ["a ", "an ", "the "];
  for (const article of articles) {
    if (lowerAnswer.startsWith(article)) {
      return lowerAnswer.substring(article.length).trim();
    }
  }
  return lowerAnswer;
};

export default function PlayGameView() {
  const [currentRiddle, setCurrentRiddle] = useState<Riddle | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [shownRiddleIds, setShownRiddleIds] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchNewRiddle = useCallback(async () => {
    setGameState("loading");
    setFeedback(null);
    setUserAnswer('');

    const excludeIdsForNextFetch = shownRiddleIds;

    try {
      const riddle = await getRiddleGame({ excludeIds: excludeIdsForNextFetch });
      setCurrentRiddle(riddle);

      if (riddle) {
        // If the server returned a riddle that was in `excludeIdsForNextFetch`,
        // it means the server has cycled. Reset the client's list.
        if (excludeIdsForNextFetch.includes(riddle.id)) {
          setShownRiddleIds([riddle.id]);
        } else {
          // Otherwise, append the new riddle ID to the list.
          setShownRiddleIds(prevIds => [...prevIds, riddle.id]);
        }
      }
      setGameState("playing");
    } catch (error) {
      console.error("Error fetching riddle:", error);
      toast({
        title: "Error",
        description: "Could not fetch a new riddle. Please try again.",
        variant: "destructive",
      });
      setGameState("idle");
    }
  }, [toast, shownRiddleIds]);

  useEffect(() => {
    // Fetch initial riddle when component mounts and is in idle state
    if (gameState === "idle") {
      fetchNewRiddle();
    }
  }, [fetchNewRiddle, gameState]);

  const handleSubmitAnswer = () => {
    if (!currentRiddle || !userAnswer.trim()) return;

    const normalizedCorrectAnswer = normalizeAnswer(currentRiddle.answer);
    const normalizedUserAnswer = normalizeAnswer(userAnswer);

    if (normalizedUserAnswer === normalizedCorrectAnswer) {
      setFeedback(`🎉 Correct! You're sharp as ever! The answer was: ${currentRiddle.answer}`);
      setScore(prevScore => prevScore + 1);
    } else {
      setFeedback(`❌ Not quite! The right answer was: ${currentRiddle.answer}. Keep trying!`);
    }
    setGameState("answered");
  };

  const handleNextPuzzle = () => {
    fetchNewRiddle();
  };

  return (
    <div className="flex justify-center items-start pt-4">
      <Card className="w-full max-w-2xl shadow-xl bg-card/80 backdrop-blur-sm rounded-lg">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2">
              <Gamepad2 className="h-7 w-7 text-primary" />
              Play a Game with Nuvia
            </CardTitle>
            <div className="text-lg font-semibold text-primary">
              Score: {score}
            </div>
          </div>
          <CardDescription>Test your wits with some fun riddles!</CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6 min-h-[200px] flex flex-col justify-center">
          {gameState === "loading" && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Fetching a new riddle...</p>
            </div>
          )}

          {gameState === "playing" && currentRiddle && (
            <div className="space-y-4">
              <Alert className="bg-muted/50 border-border">
                <Brain className="h-5 w-5 text-primary" />
                <AlertTitle className="font-semibold text-foreground">Here's your riddle:</AlertTitle>
                <AlertDescription className="text-foreground/90 text-base">
                  {currentRiddle.question}
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Your answer..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                  className="bg-input focus-visible:ring-accent"
                  aria-label="Riddle answer"
                />
                <Button onClick={handleSubmitAnswer} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Send className="h-5 w-5 mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">Submit</span>
                </Button>
              </div>
            </div>
          )}

          {gameState === "answered" && feedback && (
             <div className="space-y-4">
                {currentRiddle && <p className="text-muted-foreground text-center italic">Riddle: {currentRiddle.question}</p>}
                <Alert variant={feedback.startsWith('🎉') ? "default" : "destructive"} className={feedback.startsWith('🎉') ? "bg-green-500/10 border-green-500/50" : "bg-red-500/10 border-red-500/50"}>
                    {feedback.startsWith('🎉') ? <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" /> : <HelpCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                    <AlertTitle className={feedback.startsWith('🎉') ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                        {feedback.startsWith('🎉') ? "Result" : "Try Again!"}
                    </AlertTitle>
                    <AlertDescription className={feedback.startsWith('🎉') ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                        {feedback}
                    </AlertDescription>
                </Alert>
             </div>
          )}
           {gameState === "idle" && !currentRiddle && (
             <p className="text-center text-muted-foreground">Click "Start Game" or "Next Puzzle" to begin!</p>
           )}
        </CardContent>

        <CardFooter className="border-t pt-4">
          <Button onClick={handleNextPuzzle} className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground" disabled={gameState === "loading"}>
            {gameState === "loading" ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            {currentRiddle ? 'Next Puzzle' : 'Start Game'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
