
"use client";

import { useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, BookOpenCheck, UploadCloud, FileText, Brain, MessageSquare, Lightbulb, Wand2, Download, Youtube } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateSmartNotes, type GenerateSmartNotesInput, type GenerateSmartNotesOutput, type MCQ, type Flashcard } from '@/ai/flows/generate-smart-notes-flow';
import { generateNotesFromTranscript, type GenerateNotesFromTranscriptInput, type GenerateNotesFromTranscriptOutput } from '@/ai/flows/generate-notes-from-transcript-flow';
import { answerQuestionFromText, type AnswerQuestionFromTextInput } from '@/ai/flows/answer-question-from-text-flow';
import jsPDF from 'jspdf';
// Firebase functions import removed as it's not directly used in this simplified version.
// If actual transcript fetching is re-enabled, it will be needed.
// import { functions } from '@/lib/firebase';
// import { httpsCallable, type HttpsCallableResult } from 'firebase/functions';

interface QnaItem {
  id: string;
  question: string;
  answer: string;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// interface TranscriptResponseData { // Keep for future re-enablement
//   transcript?: string;
//   error?: string;
// }

export default function ContentStudioView() {
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [smartNotesData, setSmartNotesData] = useState<GenerateSmartNotesOutput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [documentToProcessDataUri, setDocumentToProcessDataUri] = useState<string | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isGeneratingYoutubeNotes, setIsGeneratingYoutubeNotes] = useState(false);
  const [youtubeNotesData, setYoutubeNotesData] = useState<GenerateNotesFromTranscriptOutput | null>(null);


  const [qnaQuestion, setQnaQuestion] = useState('');
  const [qnaHistory, setQnaHistory] = useState<QnaItem[]>([]);
  const [isAnsweringQna, setIsAnsweringQna] = useState(false);
  const [originalQnaContext, setOriginalQnaContext] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [mcqUserAnswers, setMcqUserAnswers] = useState<Record<string, string>>({});
  const [mcqShowAnswers, setMcqShowAnswers] = useState<Record<string, boolean>>({});
  const [flashcardShowDefinitions, setFlashcardShowDefinitions] = useState<Record<string, boolean>>({});


  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: "File too large", description: `Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        if (event.target) event.target.value = "";
        return;
      }
      
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentToProcessDataUri(reader.result as string);
        setSmartNotesData(null); 
        toast({ title: "File Selected", description: `${file.name} is ready for Smart Note generation.` });
      };
      reader.onerror = () => {
        toast({ title: "File Read Error", description: `Could not read ${file.name}.`, variant: "destructive"});
        setDocumentToProcessDataUri(null);
      }
      reader.readAsDataURL(file);
      if (event.target) event.target.value = ""; 
    }
  }, [toast]);

  const handleGenerateSmartNotes = async () => {
    if (!documentToProcessDataUri) {
      toast({ title: "No File", description: "Please upload a PDF or DOCX file to generate notes.", variant: "destructive" });
      return;
    }
    setIsLoadingDoc(true);
    setSmartNotesData(null);
    setMcqUserAnswers({});
    setMcqShowAnswers({});
    setFlashcardShowDefinitions({});

    try {
      const input: GenerateSmartNotesInput = { documentDataUri: documentToProcessDataUri, fileName: fileName || "document" };
      const result = await generateSmartNotes(input);
      setSmartNotesData(result);
      toast({ title: "Smart Notes Generated!", description: "Nuvia has created your study notes from the document." });
    } catch (error) {
      console.error("Error generating smart notes from document:", error);
      toast({ title: "Document Notes Error", description: "Failed to generate notes. The file might be corrupted or content unsuitable.", variant: "destructive" });
    } finally {
      setIsLoadingDoc(false);
    }
  };

  function extractVideoIdFromUrl(url: string): string | null {
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w\-]{11})(?:\S+)?/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  const handleGenerateYoutubeNotes = async () => {
    // This function is now effectively disabled from the UI.
    // If it were to be called, it would show the "under development" message.
    toast({ title: "Feature Under Development", description: "Generating notes from YouTube videos is coming soon!", variant: "default"});
    setIsGeneratingYoutubeNotes(false); // Ensure loading state is reset if somehow triggered
    setYoutubeNotesData(null); // Clear any old data
    return;

    // --- Original logic (kept for future reference when re-enabling) ---
    // if (!youtubeUrl.trim()) {
    //   toast({ title: "No YouTube URL", description: "Please paste a YouTube video URL.", variant: "destructive" });
    //   return;
    // }
    // const videoId = extractVideoIdFromUrl(youtubeUrl);
    // if (!videoId) {
    //   toast({ title: "Invalid YouTube URL", description: "Please enter a valid YouTube video URL.", variant: "destructive" });
    //   return;
    // }

    // setIsGeneratingYoutubeNotes(true);
    // setYoutubeNotesData(null);
    // setMcqUserAnswers({});
    // setMcqShowAnswers({});
    // setFlashcardShowDefinitions({});

    // try {
    //   toast({ title: "Fetching Transcript...", description: "Nuvia is now fetching the video transcript. This may take a moment." });
      
    //   // Dummy transcript for now - REPLACE THIS WITH ACTUAL FIREBASE FUNCTION CALL
    //   const DUMMY_TRANSCRIPT = "This is a dummy transcript for the YouTube video. In a real implementation, this would be fetched from YouTube. It talks about AI, machine learning, and the future of technology. Several key concepts are discussed, including neural networks and deep learning. This content is for testing purposes only.";
    //   console.warn("Using DUMMY_TRANSCRIPT for YouTube notes generation.");
    //   const transcript = DUMMY_TRANSCRIPT;
    //   const videoTitleFromUrl = youtubeUrl; // Or extract a cleaner title if possible

    //   if (!transcript) {
    //      throw new Error("Transcript is empty or unavailable for this video.");
    //   }
      
    //   toast({ title: "Transcript Received!", description: "Now generating smart notes from the transcript..." });

    //   const aiInput: GenerateNotesFromTranscriptInput = { transcript, videoTitle: videoTitleFromUrl };
    //   const result = await generateNotesFromTranscript(aiInput);
    //   setYoutubeNotesData(result);
    //   toast({ title: "YouTube Notes Generated!", description: "Nuvia has created smart notes from the YouTube video." });

    // } catch (error: any) {
    //   console.error("Error generating YouTube notes:", error);
    //   let errorMessage = "An unexpected error occurred while generating notes.";
    //   // This error handling expects specific codes from a Firebase Function
    //   // If using a dummy transcript or direct client-side error, these codes won't exist
    //   if (error.code) {
    //     switch (error.code) {
    //       case 'functions/not-found':
    //         errorMessage = "No transcript found for this video, or transcripts are disabled. Please try another video.";
    //         break;
    //       case 'functions/invalid-argument':
    //         errorMessage = "The YouTube URL or Video ID provided is invalid. Please check it and try again.";
    //         break;
    //       case 'functions/internal':
    //         errorMessage = "An internal error occurred while fetching the transcript. The video might not have a transcript, or there could be a temporary server issue. Please try another video or try again later.";
    //         break;
    //       default: 
    //         errorMessage = error.message || "Failed to process the YouTube video due to a server error.";
    //     }
    //   } else if (error.message) { 
    //      errorMessage = error.message;
    //   }
      
    //   toast({ title: "YouTube Notes Error", description: errorMessage, variant: "destructive" });
    //   setYoutubeNotesData(null);
    // } finally {
    //   setIsGeneratingYoutubeNotes(false);
    // }
  };
  
  const handleAskOriginalQna = async () => {
    if (!qnaQuestion.trim()) {
      toast({ title: "No Question", description: "Please type a question.", variant: "destructive" });
      return;
    }
    if (!originalQnaContext.trim()) {
      toast({ title: "No Context for Q&A", description: "Please paste text in the text area for Q&A.", variant: "destructive" });
      return;
    }

    setIsAnsweringQna(true);
    try {
      const input: AnswerQuestionFromTextInput = { userQuestion: qnaQuestion, contextText: originalQnaContext };
      const result = await answerQuestionFromText(input);
      setQnaHistory(prev => [...prev, { id: Date.now().toString(), question: qnaQuestion, answer: result.answer }]);
      setQnaQuestion('');
    } catch (error) {
      console.error("Error answering Q&A:", error);
      toast({ title: "Q&A Error", description: "Failed to get an answer.", variant: "destructive" });
    } finally {
      setIsAnsweringQna(false);
    }
  };

  const toggleShowAnswer = (mcqId: string) => {
    setMcqShowAnswers(prev => ({ ...prev, [mcqId]: !prev[mcqId] }));
  };

  const toggleShowDefinition = (flashcardId: string) => {
    setFlashcardShowDefinitions(prev => ({ ...prev, [flashcardId]: !prev[flashcardId] }));
  };

  const handleDownloadPdf = (
    notesData: GenerateSmartNotesOutput | GenerateNotesFromTranscriptOutput | null, 
    inputFileName: string | null, 
    type: 'document' | 'youtube'
  ) => {
    if (!notesData) {
      toast({ title: "No Notes", description: "Please generate notes first.", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();
    let yPos = 10;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const maxWidth = doc.internal.pageSize.width - margin * 2;
    const lineHeight = 6; 

    const checkPageBreak = (currentY: number, neededHeight: number = lineHeight * 2) => {
      if (currentY + neededHeight > pageHeight - margin) {
        doc.addPage();
        return margin; 
      }
      return currentY;
    };

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    yPos = checkPageBreak(yPos, 10);
    
    let titleText = "Smart Notes";
    if (type === 'document') {
      titleText = `Smart Notes for: ${inputFileName || 'Your Document'}`;
    } else if (type === 'youtube') {
      const videoId = extractVideoIdFromUrl(inputFileName || "");
      titleText = `Smart Notes for YouTube Video${videoId ? `: ${videoId}` : ''}`;
      if (inputFileName && !videoId) titleText = `Notes for: ${inputFileName}`; 
    }
    const titleLines = doc.splitTextToSize(titleText, maxWidth);
    doc.text(titleLines, margin, yPos);
    yPos += titleLines.length * 8 + 5;

    if (notesData.summary) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      yPos = checkPageBreak(yPos, 8);
      doc.text("Overall Summary", margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const summaryLines = doc.splitTextToSize(notesData.summary, maxWidth);
      yPos = checkPageBreak(yPos, summaryLines.length * lineHeight);
      doc.text(summaryLines, margin, yPos);
      yPos += summaryLines.length * lineHeight + 5;
    }

    if (notesData.keyConcepts && notesData.keyConcepts.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      yPos = checkPageBreak(yPos, 8);
      doc.text("Key Concepts", margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      notesData.keyConcepts.forEach(concept => {
        const conceptText = `• ${concept}`;
        const conceptLines = doc.splitTextToSize(conceptText, maxWidth);
        yPos = checkPageBreak(yPos, conceptLines.length * lineHeight);
        doc.text(conceptLines, margin, yPos);
        yPos += conceptLines.length * lineHeight;
      });
      yPos += 5;
    }

    if (notesData.mcqs && notesData.mcqs.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      yPos = checkPageBreak(yPos, 8);
      doc.text("Multiple Choice Questions", margin, yPos);
      yPos += 7;
      notesData.mcqs.forEach((mcq, index) => {
        yPos = checkPageBreak(yPos, lineHeight * 3); 
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const qText = `${index + 1}. ${mcq.question}`;
        const qLines = doc.splitTextToSize(qText, maxWidth);
        doc.text(qLines, margin, yPos);
        yPos += qLines.length * lineHeight;

        doc.setFont("helvetica", "normal");
        mcq.options.forEach((option, optIndex) => {
          const optText = `   ${String.fromCharCode(65 + optIndex)}. ${option}`;
          const optLines = doc.splitTextToSize(optText, maxWidth - 5);
          yPos = checkPageBreak(yPos, optLines.length * lineHeight);
          doc.text(optLines, margin + 5, yPos);
          yPos += optLines.length * lineHeight;
        });

        yPos = checkPageBreak(yPos);
        doc.setFont("helvetica", "italic");
        const ansText = `   Correct Answer: ${mcq.correctAnswer}`;
        const ansLines = doc.splitTextToSize(ansText, maxWidth - 5);
        doc.text(ansLines, margin + 5, yPos);
        yPos += ansLines.length * lineHeight;
        
        const explText = `   Explanation: ${mcq.explanation}`;
        const explLines = doc.splitTextToSize(explText, maxWidth - 5);
        yPos = checkPageBreak(yPos, explLines.length * lineHeight);
        doc.text(explLines, margin + 5, yPos);
        yPos += explLines.length * lineHeight + 3; 
      });
      yPos += 5;
    }

    if (notesData.flashcards && notesData.flashcards.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      yPos = checkPageBreak(yPos, 8);
      doc.text("Flashcards", margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      notesData.flashcards.forEach((flashcard) => {
        yPos = checkPageBreak(yPos, lineHeight * 3); 
        doc.setFont("helvetica", "bold");
        const termText = `Term: ${flashcard.term}`;
        const termLines = doc.splitTextToSize(termText, maxWidth);
        doc.text(termLines, margin, yPos);
        yPos += termLines.length * lineHeight;

        doc.setFont("helvetica", "normal");
        const defText = `Definition: ${flashcard.definition}`;
        const defLines = doc.splitTextToSize(defText, maxWidth);
        yPos = checkPageBreak(yPos, defLines.length * lineHeight);
        doc.text(defLines, margin, yPos);
        yPos += defLines.length * lineHeight + 3; 
      });
    }

    let safeFileNameBase = "notes";
    if (type === 'document' && inputFileName) {
        safeFileNameBase = inputFileName.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    } else if (type === 'youtube') {
        const videoId = extractVideoIdFromUrl(inputFileName || "");
        safeFileNameBase = videoId ? `youtube_${videoId}` : "youtube_lecture";
    }
    const dateString = new Date().toISOString().split('T')[0];
    const pdfFileName = `smartnotes_${safeFileNameBase}_${dateString}.pdf`;
    
    doc.save(pdfFileName);
    toast({ title: "PDF Ready!", description: "Your smart notes PDF is ready! 📄" });
  };


  const renderNotesAccordion = (notes: GenerateSmartNotesOutput | GenerateNotesFromTranscriptOutput | null, isLoadingFlag: boolean, featureUnderDevelopment: boolean = false) => {
    if (isLoadingFlag) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Nuvia is crafting your smart notes...</p>
        </div>
      );
    }
    if (featureUnderDevelopment) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Lightbulb className="h-12 w-12 text-primary mb-4" />
          <p className="text-muted-foreground">This feature is currently under development.</p>
          <p className="text-sm text-muted-foreground/80">Stay tuned for updates!</p>
        </div>
      );
    }
    if (!notes) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Lightbulb className="h-12 w-12 text-primary mb-4" />
          <p className="text-muted-foreground">Your generated notes will appear here.</p>
          <p className="text-sm text-muted-foreground/80">Upload a document or use a feature to get started.</p>
        </div>
      );
    }
    return (
      <Accordion type="multiple" defaultValue={['summary', 'concepts']} className="w-full">
        <AccordionItem value="summary">
          <AccordionTrigger className="text-md font-semibold">Overall Summary</AccordionTrigger>
          <AccordionContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-foreground">
              {notes.summary}
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="concepts">
          <AccordionTrigger className="text-md font-semibold">Key Concepts</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc list-inside space-y-1 pl-2 prose prose-sm dark:prose-invert max-w-none rounded-md bg-muted/30 p-3 text-foreground">
              {notes.keyConcepts.map((concept, index) => <li key={index}>{concept}</li>)}
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="mcqs">
          <AccordionTrigger className="text-md font-semibold">Multiple Choice Questions ({notes.mcqs.length})</AccordionTrigger>
          <AccordionContent className="space-y-4">
            {notes.mcqs.map((mcq) => (
              <Card key={mcq.id} className="bg-background/50 p-3">
                <p className="font-medium mb-2 text-foreground">{mcq.question}</p>
                <RadioGroup 
                    value={mcqUserAnswers[mcq.id] || ""} 
                    onValueChange={(value) => setMcqUserAnswers(prev => ({...prev, [mcq.id]: value}))}
                    disabled={mcqShowAnswers[mcq.id]}
                    className="space-y-1"
                >
                  {mcq.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${mcq.id}-option-${index}`} />
                      <Label htmlFor={`${mcq.id}-option-${index}`} className="font-normal text-foreground/90">{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
                <Button variant="link" size="sm" onClick={() => toggleShowAnswer(mcq.id)} className="p-0 h-auto mt-2 text-primary">
                  {mcqShowAnswers[mcq.id] ? "Hide Answer" : "Show Answer"}
                </Button>
                {mcqShowAnswers[mcq.id] && (
                  <div className="mt-2 p-2 rounded-md bg-muted/50 border border-border text-sm">
                    <p className="text-foreground"><strong>Correct Answer:</strong> {mcq.correctAnswer}</p>
                    <p className="text-foreground/80 mt-1"><strong>Explanation:</strong> {mcq.explanation}</p>
                  </div>
                )}
              </Card>
            ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="flashcards">
          <AccordionTrigger className="text-md font-semibold">Flashcards ({notes.flashcards.length})</AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.flashcards.map((flashcard) => (
              <Card key={flashcard.id} className="bg-background/50 p-3">
                <p className="font-medium text-foreground">Term: {flashcard.term}</p>
                <Button variant="link" size="sm" onClick={() => toggleShowDefinition(flashcard.id)} className="p-0 h-auto mt-1 text-primary">
                  {flashcardShowDefinitions[flashcard.id] ? "Hide Definition" : "Show Definition"}
                </Button>
                {flashcardShowDefinitions[flashcard.id] && (
                  <p className="mt-1 text-sm text-foreground/90 p-2 rounded-md bg-muted/50 border border-border">
                    <strong>Definition:</strong> {flashcard.definition}
                  </p>
                )}
              </Card>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  return (
    <Card className="w-full shadow-xl min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-12rem)] bg-card/80 backdrop-blur-sm rounded-lg flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="font-headline text-xl text-foreground flex items-center gap-2">
          <BookOpenCheck className="h-7 w-7 text-primary" />
          Nuvia Content Studio 2.0 – Smart Note Maker Edition
        </CardTitle>
        <CardDescription>Upload documents or link YouTube videos to generate summaries, MCQs, flashcards, and more.</CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="pdf_notes" className="flex-1 flex flex-col p-0">
        <CardContent className="p-0">
          <TabsList className="grid w-full grid-cols-3 mt-4 px-6">
            <TabsTrigger value="pdf_notes">PDF/Document Notes</TabsTrigger>
            <TabsTrigger value="youtube_notes">YouTube Lecture Notes</TabsTrigger>
            <TabsTrigger value="original_qna">Original Q&A</TabsTrigger>
          </TabsList>
        </CardContent>

        <TabsContent value="pdf_notes" className="flex-1 flex flex-col overflow-hidden px-6 pb-6 mt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <Card className="lg:col-span-1 shadow-md bg-card/90">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>Input Document</CardTitle>
                <CardDescription>Upload PDF or DOCX (Max ${MAX_FILE_SIZE_MB}MB)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="smart-notes-file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-input hover:bg-muted/50 border-border hover:border-primary transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span></p>
                      <p className="text-xs text-muted-foreground">PDF, DOCX</p>
                    </div>
                    <Input id="smart-notes-file-upload" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                  </label>
                </div>
                {fileName && <p className="text-sm text-muted-foreground mt-1">Selected: <span className="font-medium text-primary">{fileName}</span></p>}
              </CardContent>
              <CardFooter>
                <Button onClick={handleGenerateSmartNotes} disabled={isLoadingDoc || !documentToProcessDataUri} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isLoadingDoc ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Wand2 className="h-5 w-5 mr-2" />}
                  Generate Smart Notes
                </Button>
              </CardFooter>
            </Card>

            <Card className="lg:col-span-2 shadow-md bg-card/90 flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-primary"/>Generated Notes (Document)</CardTitle>
                  <Button variant="outline" size="sm" disabled={!smartNotesData || isLoadingDoc} onClick={() => handleDownloadPdf(smartNotesData, fileName, 'document')}>
                    <Download className="mr-2 h-4 w-4" /> Download Notes (PDF)
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-3">
                  {renderNotesAccordion(smartNotesData, isLoadingDoc)}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="youtube_notes" className="flex-1 flex flex-col overflow-hidden px-6 pb-6 mt-2">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <Card className="lg:col-span-1 shadow-md bg-card/90">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Youtube className="h-5 w-5 text-primary"/>Input YouTube Video</CardTitle>
                <CardDescription>This feature is currently under development. Enter a YouTube URL below (note generation is disabled).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="bg-input focus-visible:ring-accent"
                    disabled // Disabled input
                />
              </CardContent>
              <CardFooter>
                <Button onClick={handleGenerateYoutubeNotes} disabled className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isGeneratingYoutubeNotes ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Wand2 className="h-5 w-5 mr-2" />}
                  Generate Notes from Video (Coming Soon)
                </Button>
              </CardFooter>
            </Card>

            <Card className="lg:col-span-2 shadow-md bg-card/90 flex flex-col">
              <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-primary"/>Generated Notes (YouTube)</CardTitle>
                    <Button variant="outline" size="sm" disabled={!youtubeNotesData || isGeneratingYoutubeNotes} onClick={() => handleDownloadPdf(youtubeNotesData, youtubeUrl, 'youtube')}>
                        <Download className="mr-2 h-4 w-4" /> Download Notes (PDF)
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-3">
                  {renderNotesAccordion(youtubeNotesData, isGeneratingYoutubeNotes, true)}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="original_qna" className="flex-1 flex flex-col overflow-hidden px-6 pb-6 mt-2">
            <Card className="lg:col-span-1 shadow-md bg-card/90 flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary"/>Original Q&A</CardTitle>
                <CardDescription>Paste text below and ask questions about it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <Textarea
                  placeholder="Paste text content here for Q&A..."
                  value={originalQnaContext}
                  onChange={(e) => setOriginalQnaContext(e.target.value)}
                  rows={6}
                  className="bg-input focus-visible:ring-accent text-sm"
                />
                 <div className="flex items-center gap-2 pt-2">
                  <Input
                    placeholder="Ask a question about the text above..."
                    value={qnaQuestion}
                    onChange={(e) => setQnaQuestion(e.target.value)}
                    disabled={isAnsweringQna || !originalQnaContext.trim()}
                    className="bg-input focus-visible:ring-accent"
                  />
                  <Button onClick={handleAskOriginalQna} disabled={isAnsweringQna || !qnaQuestion.trim() || !originalQnaContext.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {isAnsweringQna ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
                  </Button>
                </div>
                <ScrollArea className="flex-1 pr-3 mt-2">
                  {qnaHistory.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      {originalQnaContext.trim() ? 'Your Q&A will appear here.' : 'Paste text above to enable Q&A.'}
                    </p>
                  )}
                  <div className="space-y-4">
                    {qnaHistory.map(item => (
                      <div key={item.id} className="rounded-md bg-muted/30 p-3">
                        <p className="font-semibold text-sm text-primary mb-1">You: {item.question}</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">Nuvia: {item.answer}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

    