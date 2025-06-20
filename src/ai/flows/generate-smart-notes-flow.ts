
'use server';
/**
 * @fileOverview Generates smart study notes from a document.
 *
 * - generateSmartNotes - A function that handles the smart note generation process.
 * - GenerateSmartNotesInput - The input type for the generateSmartNotes function.
 * - GenerateSmartNotesOutput - The return type for the generateSmartNotes function.
 * - MCQ - Type for Multiple Choice Questions.
 * - Flashcard - Type for Flashcards.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSmartNotesInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A document (PDF, DOCX), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  fileName: z.string().optional().describe("The name of the document file."),
});
export type GenerateSmartNotesInput = z.infer<typeof GenerateSmartNotesInputSchema>;

const MCQSchema = z.object({
  id: z.string().describe("A unique identifier for the MCQ (e.g., mcq-1)."),
  question: z.string().describe("The MCQ question text."),
  options: z.array(z.string()).length(4).describe("An array of 4 string options for the MCQ."),
  correctAnswer: z.string().describe("The correct answer string, which must be one of the options."),
  explanation: z.string().describe("A brief explanation for why the answer is correct."),
});
export type MCQ = z.infer<typeof MCQSchema>;

const FlashcardSchema = z.object({
  id: z.string().describe("A unique identifier for the flashcard (e.g., flashcard-1)."),
  term: z.string().describe("The term or question for the front of the flashcard."),
  definition: z.string().describe("The definition or answer for the back of the flashcard."),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

const GenerateSmartNotesOutputSchema = z.object({
  summary: z.string().describe("A comprehensive overall summary of the document content."),
  keyConcepts: z.array(z.string()).describe("A list of 3-7 key concepts from the document, presented as bullet points."),
  mcqs: z.array(MCQSchema).min(3).max(7).describe("An array of 3-7 Multiple Choice Questions based on the document content. Ensure questions cover different aspects of the document."),
  flashcards: z.array(FlashcardSchema).min(3).max(10).describe("An array of 3-10 flashcards (term/definition pairs) derived from the document."),
});
export type GenerateSmartNotesOutput = z.infer<typeof GenerateSmartNotesOutputSchema>;

export async function generateSmartNotes(input: GenerateSmartNotesInput): Promise<GenerateSmartNotesOutput> {
  return generateSmartNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSmartNotesPrompt',
  input: {schema: GenerateSmartNotesInputSchema},
  output: {schema: GenerateSmartNotesOutputSchema},
  prompt: `You are an expert AI assistant specializing in creating study materials for students from academic documents.
Given the document (optionally named {{{fileName}}}), please generate comprehensive study notes according to the output schema.

Document Content:
{{media url=documentDataUri}}

Tasks:
1.  **Overall Summary**: Write a concise yet comprehensive summary of the entire document.
2.  **Key Concepts**: Identify and list 3 to 7 main key concepts or topics discussed in the document. Present them as a list of strings.
3.  **Multiple Choice Questions (MCQs)**: Create 3 to 7 MCQs. Each MCQ must:
    *   Have a unique ID (e.g., "mcq-1", "mcq-2").
    *   Have a clear question.
    *   Provide exactly 4 distinct options.
    *   Clearly indicate the correct answer (must be one of the options).
    *   Include a brief explanation for why that answer is correct, citing evidence or reasoning from the document if possible.
    *   Questions should be distinct and cover different important parts of the document.
4.  **Flashcards**: Generate 3 to 10 flashcards. Each flashcard must:
    *   Have a unique ID (e.g., "flashcard-1").
    *   Have a clear "term" (a keyword, concept, or short question).
    *   Have a concise "definition" or answer for that term.
    *   Focus on important vocabulary, definitions, or core ideas from the document.

Ensure all generated content is based *only* on the provided document.
Structure your output strictly according to the defined output schema.
If the document is very short or lacks sufficient distinct concepts for the minimum number of MCQs or flashcards, generate as many high-quality items as possible up to the requested count. If the document is unsuitable for a particular type of note (e.g., too abstract for flashcards), you may return an empty array for that field but still attempt to fulfill other fields.
`,
});

const generateSmartNotesFlow = ai.defineFlow(
  {
    name: 'generateSmartNotesFlow',
    inputSchema: GenerateSmartNotesInputSchema,
    outputSchema: GenerateSmartNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("Failed to generate smart notes. The AI model did not return an output.");
    }
    // Ensure arrays are not null, default to empty if undefined
    return {
      summary: output.summary || "Could not generate a summary for this document.",
      keyConcepts: output.keyConcepts || [],
      mcqs: output.mcqs || [],
      flashcards: output.flashcards || [],
    };
  }
);


    