
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { generateChatResponse, type GenerateChatResponseInput, type GenerateChatResponseOutput } from '@/ai/flows/generate-chat-response';
import { Bot, User, Send, Loader2, Mic, ImagePlus, Paperclip, XCircle, FileIcon, StopCircle, AlertTriangle, Volume2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  avatar?: string;
  mediaDataUri?: string;
  mediaType?: 'image' | 'document' | 'audio';
  fileName?: string;
}

interface HistoryPart {
  text: string;
}

interface HistoryItem {
  role: 'user' | 'model';
  parts: HistoryPart[];
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_HISTORY_MESSAGES = 20; // Approx 10 user/model pairs


export default function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [selectedMedia, setSelectedMedia] = useState<{
    dataUrl: string | null;
    file: File | null;
    type: 'image' | 'document' | 'audio' | null;
    fileName?: string;
  }>({ dataUrl: null, file: null, type: null });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);


  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Cleanup speech synthesis on component unmount
    return () => {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
    };
  }, []);

  const handleFileSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: `Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        });
        if (event.target) event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedMedia({ dataUrl: reader.result as string, file, type, fileName: file.name });
      };
      reader.readAsDataURL(file);
    }
     if (event.target) event.target.value = "";
  }, [toast]);

  const clearSelectedMedia = () => {
    setSelectedMedia({ dataUrl: null, file: null, type: null, fileName: undefined });
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    const trimmedInput = currentInput.trim();
    if (!trimmedInput && !selectedMedia.dataUrl) return;

    // Cancel any ongoing speech before sending a new message or receiving one
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmedInput,
      sender: 'user',
      mediaDataUri: selectedMedia.dataUrl ?? undefined,
      mediaType: selectedMedia.type ?? undefined,
      fileName: selectedMedia.fileName ?? selectedMedia.file?.name ?? undefined,
    };
    
    const previousMessagesForHistory = [...messages]; 
    setMessages((prev) => [...prev, userMessage]);
    
    const mediaDataForRequest = selectedMedia.dataUrl;
    const mediaTypeForRequest = selectedMedia.type;

    setCurrentInput('');
    clearSelectedMedia();
    setIsLoading(true);

    try {
      const recentHistory = previousMessagesForHistory.slice(-MAX_HISTORY_MESSAGES);
      const historyForAI: HistoryItem[] = recentHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text || "" }], 
      }));
      
      const aiInput: GenerateChatResponseInput = {
        userInput: trimmedInput,
        history: historyForAI,
        mediaDataUri: mediaDataForRequest ?? undefined,
        mediaType: mediaTypeForRequest ?? undefined,
      };
      
      const result: GenerateChatResponseOutput = await generateChatResponse(aiInput);

      if (!result || !result.response) {
        console.error("AI response was null or empty. Full response data:", result);
        throw new Error("Received an empty response from the AI.");
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: result.response,
        sender: 'ai',
      };
      setMessages((prev) => [...prev, aiMessage]);

    } catch (error: any) {
      console.error("Error calling Genkit AI flow:", error);
      toast({
        title: "Chat Error",
        description: error.message || "Failed to get a response from Nuvia. Please try again.",
        variant: "destructive",
      });
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I couldn't process that. Please try again.",
        sender: 'ai',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUri = reader.result as string;
          const fileName = `recorded_audio_${Date.now()}.webm`;
          setSelectedMedia({ dataUrl: dataUri, file: null, type: 'audio', fileName });
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setHasMicPermission(false);
      toast({
        title: "Microphone Access Denied",
        description: "Please enable microphone permissions in your browser settings.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      clearSelectedMedia(); 
      startRecording();
    }
  };
  
  useEffect(() => {
    return () => { 
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleToggleSpeak = (messageId: string, textToSpeak: string) => {
    if (!('speechSynthesis' in window)) {
      toast({ title: "Read Aloud Not Supported", description: "Your browser does not support text-to-speech.", variant: "destructive" });
      return;
    }

    const synth = window.speechSynthesis;

    if (speakingMessageId === messageId && synth.speaking) {
      synth.cancel();
      setSpeakingMessageId(null);
    } else {
      if (synth.speaking) {
        synth.cancel(); 
      }
      const cleanText = textToSpeak.replace(/[^\w\s.,!?'"-]/g, '');
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      
      const voices = synth.getVoices();
      const femaleVoice = voices.find(voice => voice.lang === 'en-US' && voice.name.toLowerCase().includes('female'));
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      } else {
        const defaultVoice = voices.find(voice => voice.lang === 'en-US');
        if (defaultVoice) utterance.voice = defaultVoice;
      }

      utterance.onend = () => {
        setSpeakingMessageId(null);
      };
      utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror event:', event);
        // @ts-ignore
        const eventError = event.error;
        // Only show toast for critical errors, not for 'canceled' or 'interrupted'
        if (eventError && eventError !== 'canceled' && eventError !== 'interrupted') {
            let errorMsg = "Could not play audio for this message.";
            if (eventError === 'audio-busy') {
                errorMsg = "Audio system is busy. Please try again.";
            } else if (eventError === 'synthesis-failed' || eventError === 'language-unavailable' || eventError === 'voice-unavailable') {
                errorMsg = "Text-to-speech engine failed, the language is unavailable, or selected voice is unavailable.";
            } else if (eventError === 'text-too-long'){
                errorMsg = "The text is too long to be spoken.";
            } else if (eventError === 'invalid-argument'){
                errorMsg = "Invalid argument provided to speech engine.";
            }
            toast({ title: "Speech Error", description: errorMsg, variant: "destructive" });
        }
        setSpeakingMessageId(null); // Ensure state is reset even on error
      };
      synth.speak(utterance);
      setSpeakingMessageId(messageId);
    }
  };

  const formatMessageText = (text: string) => {
    if (!text) return '';
    let formattedText = text;
    
    formattedText = formattedText.replace(/```(\w*)\n([\s\S]*?)\n```/g, (match, language, code) => {
      const langClass = language ? `language-${language}` : '';
      const escapedCode = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
      return `<pre><code class="${langClass} !text-xs sm:!text-sm">${escapedCode}</code></pre>`;
    });

    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); 
    formattedText = formattedText.replace(/(?<!`)`(?!`)(.*?)(?<!`)`(?!`)/g, '<code>$1</code>'); 
    
    return formattedText;
  };

  return (
    <Card className="w-full h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)] shadow-xl flex flex-col bg-card/80 backdrop-blur-sm rounded-lg">
      <CardHeader className="border-b">
        <CardTitle className="font-headline text-lg text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          Nuvia Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {hasMicPermission === false && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Microphone Access Denied</AlertTitle>
              <AlertDescription>
                Nuvia needs microphone access to record audio. Please enable it in your browser settings and refresh the page.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-3 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'ai' && (
                  <Avatar className="h-8 w-8 self-end flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot size={18} />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] rounded-xl px-4 py-3 shadow-md flex flex-col relative group
                    ${ msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted text-muted-foreground rounded-bl-none'
                    }
                    ${ speakingMessageId === msg.id ? 'ring-2 ring-primary/70 shadow-lg shadow-primary/40 transition-all duration-300' : '' }
                  `}
                  style={{
                     boxShadow: msg.sender === 'user' ? '2px 2px 5px hsl(var(--primary)/0.2), -2px -2px 5px hsl(var(--primary)/0.1)' : '2px 2px 5px hsl(var(--muted)/0.2), -2px -2px 5px hsl(var(--muted)/0.1)',
                  }}
                >
                  {msg.mediaDataUri && msg.mediaType === 'image' && (
                    <Image src={msg.mediaDataUri} alt={msg.fileName || "Uploaded image"} width={200} height={200} className="rounded-md mb-2 object-contain max-h-48" data-ai-hint="chat message image"/>
                  )}
                  {msg.mediaDataUri && msg.mediaType === 'document' && msg.fileName && (
                    <div className="flex items-center gap-2 mb-2 p-2 rounded-md bg-background/50">
                      <FileIcon className="h-5 w-5 text-foreground/70" />
                      <span className="text-sm text-foreground/90">{msg.fileName}</span>
                    </div>
                  )}
                  {msg.mediaDataUri && msg.mediaType === 'audio' && (
                    <div className="mb-2">
                       {msg.fileName && <p className="text-xs mb-1">{msg.fileName}</p>}
                       <audio controls src={msg.mediaDataUri} className="w-full h-10"></audio>
                    </div>
                  )}
                  {msg.text && (
                     <div 
                        className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none" 
                        dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }}
                     />
                  )}
                  {msg.sender === 'ai' && msg.text && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleSpeak(msg.id, msg.text)}
                      className={`absolute -top-3 -right-3 h-7 w-7 p-1 rounded-full bg-card text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                  ${speakingMessageId === msg.id ? '!opacity-100 text-primary' : ''}`}
                      aria-label={speakingMessageId === msg.id ? "Stop reading" : "Read aloud"}
                    >
                      {speakingMessageId === msg.id ? <StopCircle size={18} /> : <Volume2 size={18} />}
                    </Button>
                  )}
                </div>
                {msg.sender === 'user' && (
                  <Avatar className="h-8 w-8 self-end flex-shrink-0">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      <User size={18} />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-3 justify-start">
                <Avatar className="h-8 w-8">
                   <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot size={18} />
                    </AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] rounded-xl px-4 py-3 shadow-md bg-muted text-muted-foreground rounded-bl-none">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {selectedMedia.dataUrl && (
        <div className="p-2 border-t bg-muted/30">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {selectedMedia.type === 'image' && selectedMedia.file && (
              <div className="flex items-center gap-2">
                <Image src={selectedMedia.dataUrl} alt={selectedMedia.file.name} width={40} height={40} className="rounded object-cover" data-ai-hint="image preview" />
                <span>{selectedMedia.file.name}</span>
              </div>
            )}
            {selectedMedia.type === 'document' && selectedMedia.file && (
              <div className="flex items-center gap-2">
                <FileIcon className="h-5 w-5" />
                <span>{selectedMedia.file.name}</span>
              </div>
            )}
            {selectedMedia.type === 'audio' && selectedMedia.fileName && (
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                <span>{selectedMedia.fileName}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={clearSelectedMedia} className="h-6 w-6 text-muted-foreground hover:text-destructive">
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CardFooter className="border-t pt-4">
        <div className="flex w-full items-center gap-2">
          <Input type="file" ref={fileInputRef} onChange={(e) => handleFileSelection(e, 'document')} accept="application/pdf,text/plain,.doc,.docx,.md" className="hidden" id="chat-file-input"/>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" aria-label="Attach file" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isRecording}>
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Input type="file" ref={imageInputRef} onChange={(e) => handleFileSelection(e, 'image')} accept="image/*" className="hidden" id="chat-image-input"/>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" aria-label="Upload image" onClick={() => imageInputRef.current?.click()} disabled={isLoading || isRecording}>
            <ImagePlus className="h-5 w-5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className={`text-muted-foreground hover:text-primary ${isRecording ? 'text-destructive hover:text-destructive/90' : ''}`} 
            aria-label={isRecording ? "Stop recording" : "Start recording"} 
            onClick={handleMicClick}
            disabled={isLoading || hasMicPermission === false}
          >
            {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Input
            type="text"
            placeholder="Type your message..."
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            disabled={isLoading}
            className="flex-1 bg-input focus-visible:ring-accent"
          />
          <Button onClick={handleSend} disabled={isLoading || (!currentInput.trim() && !selectedMedia.dataUrl)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

