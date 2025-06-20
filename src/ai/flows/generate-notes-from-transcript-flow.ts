
'use server';
/**
 * @fileOverview Generates smart notes from a YouTube video transcript.
 *
 * - generateNotesFromTranscript - A function that handles note generation from a transcript.
 * - GenerateNotesFromTranscriptInput - The input type.
 * - GenerateNotesFromTranscriptOutput - The return type.
 * - MCQ - Type for Multiple Choice Questions (reused or could be specific).
 * - Flashcard - Type for Flashcards (reused or could be specific).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Re-using MCQ and Flashcard schemas from smart-notes-flow for consistency for now.
// If they were to diverge significantly, they should be defined uniquely here.
const MCQSchema = z.object({
  id: z.string().describe("A unique identifier for the MCQ (e.g., mcq-yt-1)."),
  question: z.string().describe("The MCQ question text based on the transcript."),
  options: z.array(z.string()).length(4).describe("An array of 4 string options for the MCQ."),
  correctAnswer: z.string().describe("The correct answer string, which must be one of the options."),
  explanation: z.string().describe("A brief explanation for why the answer is correct, based on the transcript."),
});
export type MCQ = z.infer<typeof MCQSchema>;

const FlashcardSchema = z.object({
  id: z.string().describe("A unique identifier for the flashcard (e.g., flashcard-yt-1)."),
  term: z.string().describe("The term or question for the front of the flashcard from the transcript."),
  definition: z.string().describe("The definition or answer for the back of the flashcard from the transcript."),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;


const GenerateNotesFromTranscriptInputSchema = z.object({
  transcript: z.string().describe('The full text transcript of the YouTube video.'),
  videoTitle: z.string().optional().describe('The title of the YouTube video, if available.'),
});
export type GenerateNotesFromTranscriptInput = z.infer<typeof GenerateNotesFromTranscriptInputSchema>;

const GenerateNotesFromTranscriptOutputSchema = z.object({
  summary: z.string().describe("A concise summary of the video transcript (2-3 paragraphs)."),
  keyConcepts: z.array(z.string()).describe("A list of 3-7 key concepts or topics from the transcript, presented as bullet points."),
  mcqs: z.array(MCQSchema).min(3).max(7).describe("An array of 3-7 Multiple Choice Questions based on the transcript."),
  flashcards: z.array(FlashcardSchema).min(3).max(10).describe("An array of 3-10 flashcards derived from the transcript."),
});
export type GenerateNotesFromTranscriptOutput = z.infer<typeof GenerateNotesFromTranscriptOutputSchema>;

export async function generateNotesFromTranscript(input: GenerateNotesFromTranscriptInput): Promise<GenerateNotesFromTranscriptOutput> {
  return generateNotesFromTranscriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNotesFromTranscriptPrompt',
  input: {schema: GenerateNotesFromTranscriptInputSchema},
  output: {schema: GenerateNotesFromTranscriptOutputSchema},
  prompt: `You are an expert AI assistant specializing in creating study materials from video lecture transcripts.
Given the transcript (optionally from a video titled "{{#if videoTitle}}{{{videoTitle}}}{{else}}this video{{/if}}"), please generate comprehensive study notes according to the output schema.

Video Transcript:
\`\`\`
{{{transcript}}}
\`\`\`

Tasks:
1.  **Overall Summary**: Write a concise summary of the transcript (2-3 paragraphs).
2.  **Key Concepts**: Identify and list 3 to 7 main key concepts or topics discussed. Present them as a list of strings.
3.  **Multiple Choice Questions (MCQs)**: Create 3 to 7 MCQs. Each MCQ must:
    *   Have a unique ID (e.g., "mcq-yt-1").
    *   Have a clear question based on the transcript.
    *   Provide exactly 4 distinct options.
    *   Clearly indicate the correct answer (must be one of the options).
    *   Include a brief explanation for why that answer is correct, citing evidence or reasoning from the transcript.
    *   Questions should be distinct and cover different important parts of the transcript.
4.  **Flashcards**: Generate 3 to 10 flashcards. Each flashcard must:
    *   Have a unique ID (e.g., "flashcard-yt-1").
    *   Have a clear "term" (a keyword, concept, or short question from the transcript).
    *   Have a concise "definition" or answer for that term, derived from the transcript.
    *   Focus on important vocabulary, definitions, or core ideas.

Ensure all generated content is based *only* on the provided transcript.
Structure your output strictly according to the defined output schema.
If the transcript is very short or lacks sufficient distinct concepts for the minimum number of MCQs or flashcards, generate as many high-quality items as possible up to the requested count. If the transcript is unsuitable for a particular type of note, you may return an empty array for that field but still attempt to fulfill other fields.
`,
});

const generateNotesFromTranscriptFlow = ai.defineFlow(
  {
    name: 'generateNotesFromTranscriptFlow',
    inputSchema: GenerateNotesFromTranscriptInputSchema,
    outputSchema: GenerateNotesFromTranscriptOutputSchema,
  },
  async input => {
    if (!input.transcript || input.transcript.trim() === "") {
        // Return a valid, empty-like output if transcript is empty to avoid breaking Zod schema on output
        return {
            summary: "No transcript provided or transcript was empty. Cannot generate notes.",
            keyConcepts: [],
            mcqs: [],
            flashcards: [],
        };
    }
    const {output} = await prompt(input);
     if (!output) {
      // This case should ideally be handled by Genkit if the model truly returns nothing,
      // but as a fallback for safety:
      return {
        summary: "Failed to generate notes from transcript. The AI model did not return a valid output.",
        keyConcepts: [],
        mcqs: [],
        flashcards: [],
      };
    }
    // Ensure all parts of the output are at least empty arrays if the model omits them
    return {
      summary: output.summary || "Could not generate a summary for this transcript.",
      keyConcepts: output.keyConcepts || [],
      mcqs: output.mcqs || [],
      flashcards: output.flashcards || [],
    };
  }
);

