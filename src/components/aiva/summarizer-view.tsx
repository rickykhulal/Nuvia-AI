
"use client";

import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { summarizeDocument, type SummarizeDocumentInput } from '@/ai/flows/summarize-document';
import { generateChatResponse } from '@/ai/flows/generate-chat-response';
import { FileText, Loader2, UploadCloud, Sparkles } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SummarizerView() {
  const [textToSummarize, setTextToSummarize] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB for summarization.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setTextToSummarize(''); 
    }
  };

  const handleSummarize = async () => {
    setIsLoading(true);
    setSummary('');

    if (file) { 
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        try {
          const input: SummarizeDocumentInput = { documentDataUri: dataUri };
          const result = await summarizeDocument(input);
          setSummary(result.summary);
          toast({ title: "Document Summarized", description: "Nuvia has summarized the uploaded document." });
        } catch (error) {
          console.error("Error summarizing document:", error);
          toast({ title: "Error", description: "Failed to summarize document. The file type might not be supported or an error occurred.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        toast({ title: "Error", description: "Failed to read the file.", variant: "destructive" });
        setIsLoading(false);
      };
      reader.readAsDataURL(file);

    } else if (textToSummarize.trim()) { 
      try {
        const chatInput = {
          userInput: `Please summarize the following text:\n\n${textToSummarize}`,
          context: "User is requesting a text summarization from Nuvia."
        };
        const result = await generateChatResponse(chatInput);
        setSummary(result.response);
        toast({ title: "Text Summarized", description: "Nuvia has summarized your text." });
      } catch (error) {
        console.error("Error summarizing text:", error);
        toast({ title: "Error", description: "Failed to summarize text. Please try again.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else {
      toast({ title: "Input Required", description: "Please provide text or a file to summarize.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
  };


  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-xl bg-card/80 backdrop-blur-sm rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-lg text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Document & Text Summarizer
          </CardTitle>
          <CardDescription>Upload a document (PDF, TXT, etc.) or paste text to get a concise summary.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="file-upload" className="text-sm font-medium text-foreground">Upload Document</label>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-28 sm:h-32 border-2 border-dashed rounded-lg cursor-pointer bg-input hover:bg-muted/50 border-border hover:border-primary transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PDF, DOCX, TXT (MAX. 5MB)</p>
                    </div>
                    <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,.md" />
                </label>
            </div>
            {fileName && <p className="text-sm text-muted-foreground mt-1">Selected file: <span className="font-medium text-primary">{fileName}</span></p>}
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Textarea
            placeholder="Paste your text here to summarize..."
            value={textToSummarize}
            onChange={(e) => { setTextToSummarize(e.target.value); setFile(null); setFileName(null);}}
            rows={8}
            className="bg-input focus-visible:ring-accent"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSummarize} disabled={isLoading || (!textToSummarize.trim() && !file)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Summarize
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-xl h-auto max-h-[70vh] md:h-auto md:max-h-[calc(100vh-16rem)] flex flex-col bg-card/80 backdrop-blur-sm rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-lg text-foreground">Summary Output</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex-1 overflow-hidden">
          {isLoading && (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          )}
          {!isLoading && !summary && (
            <p className="text-center text-muted-foreground py-8">Your summary will appear here.</p>
          )}
          {!isLoading && summary && (
            <ScrollArea className="h-full pr-3">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md bg-muted/30 p-4">
                {summary}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
