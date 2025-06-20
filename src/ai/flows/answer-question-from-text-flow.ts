
'use server';
/**
 * @fileOverview Answers user questions based on provided context text or document.
 *
 * - answerQuestionFromText - A function that handles the Q&A process.
 * - AnswerQuestionFromTextInput - The input type for the answerQuestionFromText function.
 * - AnswerQuestionFromTextOutput - The return type for the answerQuestionFromText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerQuestionFromTextInputSchema = z.object({
  userQuestion: z.string().describe('The question asked by the user.'),
  contextText: z.string().optional().describe('The text content that should be used to answer the question.'),
  documentDataUri: z.string().optional().describe("A document to process, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  fileName: z.string().optional().describe('The optional name of the file this text or document came from.'),
});
export type AnswerQuestionFromTextInput = z.infer<typeof AnswerQuestionFromTextInputSchema>;

const AnswerQuestionFromTextOutputSchema = z.object({
  answer: z.string().describe("A comprehensive answer to the user's question based *only* on the provided context. If the context doesn't provide enough information, state that clearly."),
});
export type AnswerQuestionFromTextOutput = z.infer<typeof AnswerQuestionFromTextOutputSchema>;

export async function answerQuestionFromText(input: AnswerQuestionFromTextInput): Promise<AnswerQuestionFromTextOutput> {
  return answerQuestionFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerQuestionFromTextPrompt',
  input: {schema: AnswerQuestionFromTextInputSchema},
  output: {schema: AnswerQuestionFromTextOutputSchema},
  prompt: `You are an AI assistant that answers questions based *strictly* on the provided context.
Do not use any external knowledge. If the answer cannot be found in the context, say so.

{{#if documentDataUri}}
Context (from document{{#if fileName}} "{{fileName}}"{{/if}}):
{{media url=documentDataUri}}
{{else}}
Context Text:
\`\`\`
{{{contextText}}}
\`\`\`
{{/if}}

User's Question:
"{{{userQuestion}}}"

Based *only* on the Context provided above, answer the User's Question.
`,
});

const answerQuestionFromTextFlow = ai.defineFlow(
  {
    name: 'answerQuestionFromTextFlow',
    inputSchema: AnswerQuestionFromTextInputSchema,
    outputSchema: AnswerQuestionFromTextOutputSchema,
  },
  async input => {
    if (!input.contextText && !input.documentDataUri) {
      throw new Error("Either contextText or documentDataUri must be provided for Q&A.");
    }
    const {output} = await prompt(input);
    return output!;
  }
);

