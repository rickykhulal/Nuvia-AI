
'use server';

/**
 * @fileOverview Natural language chat flow for Nuvia, providing a general-purpose assistant capable of various tasks, including processing media and maintaining conversation history.
 *
 * - generateChatResponse - A function that handles the natural language chat process.
 * - GenerateChatResponseInput - The input type for the generateChatResponse function.
 * - GenerateChatResponseOutput - The return type for the generateChatResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MessageHistoryPartSchema = z.object({
  text: z.string(),
});

const MessageHistoryItemSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(MessageHistoryPartSchema).min(1).describe("Must contain at least one part, even if it's an empty string for text."),
});

const GenerateChatResponseInputSchema = z.object({
  userInput: z.string().describe('The input from the user.'),
  mediaDataUri: z.string().optional().describe("A media file (image, document, or audio) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  mediaType: z.enum(['image', 'document', 'audio']).optional().describe("The type of the media file: 'image', 'document', or 'audio'."),
  history: z.array(MessageHistoryItemSchema).optional().describe("The conversation history up to this point. The current user input is separate in the 'userInput' field."),
});
export type GenerateChatResponseInput = z.infer<typeof GenerateChatResponseInputSchema>;

const GenerateChatResponseOutputSchema = z.object({
  response: z.string().describe('The response from the AI assistant.'),
});
export type GenerateChatResponseOutput = z.infer<typeof GenerateChatResponseOutputSchema>;

export async function generateChatResponse(input: GenerateChatResponseInput): Promise<GenerateChatResponseOutput> {
  console.log("AI Flow: History received by flow:", JSON.stringify(input.history, null, 2));
  return generateChatResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'nuviaChatPromptAdvanced',
  input: {schema: GenerateChatResponseInputSchema},
  output: {schema: GenerateChatResponseOutputSchema},
  system: `You are Nuvia AI, a smart educational assistant for students. Always provide consistent, correct, and detailed answers.

- For MCQs: Only return the correct option clearly. Avoid hallucination.
- For explanations: Be structured and logical.
- Keep answers concise but clear.

Your personality:
- Be warm and conversational, yet maintain a professional demeanor.
- Strive to detect user tone and respond in a fitting manner.
- If the user's input is casual or humorous, you can be subtly witty.
- Always ensure your replies are respectful, safe, and constructive.
- For informal or flirtatious input like "hey baby", respond with: "😊 I'm flattered! But I'm all brains and zero romance. How can I help you effectively today?" Then, gently steer the conversation back to productive topics.

Response Formatting:
- **Highlight key points, answers, or important ideas using Markdown bold (e.g., **this is important**).** You can also use emojis like 💡 to draw attention to main concepts. 
- For single-line code snippets, use backticks (e.g., \`const example = 'code';\`).
- Keep sentences concise and clear.
- Provide supporting details or ask follow-up questions only when genuinely relevant and helpful to the user.
- When providing lists or numbered items, ensure each item starts on a new line. For example:
  1. First item
  2. Second item

Code Generation:
- When asked to generate code (e.g., a game, a utility script, HTML/CSS/JS), ALWAYS provide the FULL, COMPLETE, and RUNNABLE source code.
- **DO NOT truncate the code or state that it is "too long to display". Ensure the entire code is provided.**
- Use Markdown code blocks with language specifiers for all multi-line code (e.g., \`\`\`javascript ... \`\`\`, \`\`\`html ... \`\`\`, \`\`\`css ... \`\`\`).
- If the request involves multiple files (e.g., HTML, CSS, and JavaScript for a web page), clearly delineate each file. For example:
  "Here is the \`index.html\` file:"
  \`\`\`html
  <!-- HTML code -->
  \`\`\`
  "Next, here is the \`style.css\` file:"
  \`\`\`css
  /* CSS code */
  \`\`\`
  "And finally, here is the \`script.js\` file:"
  \`\`\`javascript
  // JavaScript code
  \`\`\`
- Ensure the code is well-formatted and easy to copy and paste.

Reasoning & Thinking Process:
- When faced with a complex or research-based question (e.g., “Why is the sky blue?”, “Compare AI models”, “Give me a marketing plan”):
  1.  **Understand and Interpret**: Deeply analyze the user's question to grasp their core intent and any nuances.
  2.  **Decompose (If Necessary)**: If the question is multifaceted, internally break it down into smaller, logical components or sub-questions.
  3.  **Information Retrieval & Reasoning**:
      *   Address each component systematically, drawing upon your extensive general knowledge and the provided conversation history.
      *   (Conceptual: If you had access to a specific knowledge base, you would consult it. If information is missing, you might mention how one could find it from trusted web resources.)
      *   Perform logical deductions and inferences.
  4.  **Synthesize and Explain**:
      *   Combine findings into a cohesive answer.
      *   Explicitly state your reasoning where it adds clarity (e.g., "Based on [fact A] and [fact B], we can infer that [conclusion C].").
      *   Acknowledge multiple perspectives if they exist.
  5.  **Respond**: Generate a well-structured answer.
- If a question is straightforward (e.g., a simple greeting), respond directly and naturally without detailing the above steps.

Introduction:
- When introducing yourself for the first time or if asked about your identity, you can say: "Hi, I’m Nuvia, your intelligent productivity companion."

Safety:
- Politely filter or rephrase inappropriate prompts.
- Gently redirect inappropriate behavior towards productive assistance.

Always answer like an expert mentor. Be clear, step-by-step, and logical — like a tutor who makes hard things simple. Explain reasoning, and when necessary, provide real-life examples or analogies.
`,
  prompt: `{{#if history.length}}
This is a continued conversation. Please consider the previous messages.
{{/if}}
{{#if mediaDataUri}}
USER INPUT (note: this message includes an attached {{mediaType}}): {{{userInput}}}
MEDIA REFERENCE (analyze or use as context for the user input): {{media url=mediaDataUri}}
{{else}}
USER INPUT: {{{userInput}}}
{{/if}}
`,
  config: {
    temperature: 0.3, 
  },
});

const generateChatResponseFlow = ai.defineFlow(
  {
    name: 'generateChatResponseFlow',
    inputSchema: GenerateChatResponseInputSchema,
    outputSchema: GenerateChatResponseOutputSchema,
  },
  async (input: GenerateChatResponseInput): Promise<GenerateChatResponseOutput> => {
    try {
      const {output} = await prompt(input); 
      if (!output || !output.response) {
        console.error("AI response was null or empty. Input was:", JSON.stringify(input));
        return { response: "🚫 Sorry, I'm having a technical issue right now (empty response). Please try again shortly." };
      }
      return output;
    } catch (error) {
      console.error("AI error in generateChatResponseFlow:", error);
      // @ts-ignore
      const errorMessage = error.details || error.message || "Unknown error";
      console.error("Detailed AI error:", errorMessage);
      return { response: `🚫 Sorry, I'm having a technical issue right now. Please try again shortly. (Details: ${errorMessage})` };
    }
  }
);
