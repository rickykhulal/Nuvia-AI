
'use server';
/**
 * @fileOverview Generates a summary and quiz questions from provided text content or document.
 *
 * - generateQuizFromText - A function that handles the quiz generation process.
 * - GenerateQuizFromTextInput - The input type for the generateQuizFromText function.
 * - GenerateQuizFromTextOutput - The return type for the generateQuizFromText function.
 * - QuizQuestion - The type for individual quiz questions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizFromTextInputSchema = z.object({
  textContent: z.string().optional().describe('The text content to process.'),
  documentDataUri: z.string().optional().describe("A document to process, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  fileName: z.string().optional().describe('The optional name of the file this text or document came from.'),
});
export type GenerateQuizFromTextInput = z.infer<typeof GenerateQuizFromTextInputSchema>;

const QuizQuestionSchema = z.object({
  id: z.string().describe("A unique identifier for the question (e.g., a short hash or random string)."),
  questionText: z.string().describe("The text of the quiz question. Ensure it's answerable from the provided text/document."),
  answerText: z.string().describe("The correct answer to the question. This should be concise and directly from the text/document if possible."),
  questionType: z.enum(['short_answer', 'multiple_choice', 'true_false'])
                  .describe("The type of question. Aim for 'short_answer' if other types are hard to formulate from the text/document."),
  options: z.array(z.string()).optional()
            .describe("For 'multiple_choice', provide 3-4 options. The 'answerText' must be one of these options. For other types, this can be omitted."),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

const GenerateQuizFromTextOutputSchema = z.object({
  summary: z.string().describe("A concise summary of the provided text content or document (2-4 sentences)."),
  questions: z.array(QuizQuestionSchema)
    .min(1)
    .max(5)
    .describe("An array of 1-5 quiz questions based on the text content/document. Prioritize 'short_answer' questions. Ensure questions are distinct and cover different parts of the text/document if possible."),
});
export type GenerateQuizFromTextOutput = z.infer<typeof GenerateQuizFromTextOutputSchema>;

export async function generateQuizFromText(input: GenerateQuizFromTextInput): Promise<GenerateQuizFromTextOutput> {
  return generateQuizFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizFromTextPrompt',
  input: {schema: GenerateQuizFromTextInputSchema},
  output: {schema: GenerateQuizFromTextOutputSchema},
  prompt: `You are an expert at analyzing content and creating educational material.
Given the following content (optionally from a file named {{{fileName}}}), please perform two tasks:
1.  Generate a concise summary of the content (2-4 sentences).
2.  Generate 1 to 5 quiz questions based *only* on the provided content.
    *   Prioritize creating 'short_answer' type questions.
    *   If you create 'multiple_choice' questions, ensure one of the options is the correct answerText.
    *   Ensure questions are answerable directly from the provided content and cover different aspects if possible.
    *   Each question must have a unique id.
    *   Provide the correct answer for each question.

{{#if documentDataUri}}
CONTENT (from document):
{{media url=documentDataUri}}
{{else}}
CONTENT (from text):
\`\`\`
{{{textContent}}}
\`\`\`
{{/if}}

Generate the summary and questions according to the output schema.
`,
});

const generateQuizFromTextFlow = ai.defineFlow(
  {
    name: 'generateQuizFromTextFlow',
    inputSchema: GenerateQuizFromTextInputSchema,
    outputSchema: GenerateQuizFromTextOutputSchema,
  },
  async input => {
    if (!input.textContent && !input.documentDataUri) {
      throw new Error("Either textContent or documentDataUri must be provided.");
    }
    const {output} = await prompt(input);
    if (!output || !output.questions || output.questions.length === 0) {
      return {
        summary: output?.summary || "Could not generate a summary for this content.",
        questions: [{
          id: 'fallback_q1',
          questionText: "What is the main topic of the provided content?",
          answerText: "User needs to determine based on reading.",
          questionType: "short_answer"
        }]
      };
    }
    return output;
  }
);
