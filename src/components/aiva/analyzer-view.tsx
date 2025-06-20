
"use client";

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { analyzeImage, type AnalyzeImageInput } from '@/ai/flows/analyze-image';
import { ScanSearch, Loader2, UploadCloud, Sparkles } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AnalyzerView() {
  const [analysisResult, setAnalysisResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        toast({
          title: "Image too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
      setImageDataUrl(null);
    }
  }, [toast]);

  const handleAnalyzeImage = async () => {
    if (!imageDataUrl) {
      toast({ title: "No Image Selected", description: "Please upload an image to analyze.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setAnalysisResult('');
    try {
      const input: AnalyzeImageInput = { photoDataUri: imageDataUrl };
      const result = await analyzeImage(input);
      setAnalysisResult(result.analysisResults);
      toast({ title: "Image Analyzed", description: "Nuvia has analyzed the image." });
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast({ title: "Error", description: "Failed to analyze image. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-xl bg-card/80 backdrop-blur-sm rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-lg text-foreground flex items-center gap-2">
            <ScanSearch className="h-6 w-6 text-primary" />
            Image Analyzer
          </CardTitle>
          <CardDescription>Upload an image (JPG, PNG, etc.) and Nuvia will analyze its content.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="image-upload" className="text-sm font-medium text-foreground">Upload Image</label>
             <div className="flex items-center justify-center w-full">
                <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-40 md:h-48 border-2 border-dashed rounded-lg cursor-pointer bg-input hover:bg-muted/50 border-border hover:border-primary transition-colors">
                    {imagePreview ? (
                        <Image src={imagePreview} alt="Image preview" width={150} height={150} className="object-contain max-h-36 md:max-h-40 rounded-md" data-ai-hint="uploaded image" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, GIF (MAX. 5MB)</p>
                      </div>
                    )}
                    <Input id="image-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                </label>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAnalyzeImage} disabled={isLoading || !imageDataUrl} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Analyze Image
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-xl h-auto max-h-[70vh] md:h-auto md:max-h-[calc(100vh-16rem)] flex flex-col bg-card/80 backdrop-blur-sm rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-lg text-foreground">Analysis Results</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex-1 overflow-hidden">
           {isLoading && (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          )}
          {!isLoading && !analysisResult && (
            <p className="text-center text-muted-foreground py-8">Analysis results will appear here.</p>
          )}
          {!isLoading && analysisResult && (
            <ScrollArea className="h-full pr-3">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md bg-muted/30 p-4">
                {analysisResult}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
