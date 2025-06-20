
'use server';

/**
 * @fileOverview Creates, prioritizes, and auto-schedules tasks with deadlines, starting from the current date.
 *
 * - smartTaskCreation - A function that handles the task creation process.
 * - SmartTaskCreationInput - The input type for the smartTaskCreation function.
 * - SmartTaskCreationOutput - The return type for the smartTaskCreation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartTaskCreationInputSchema = z.object({
  request: z
    .string()
    .describe('The task request from the user, e.g., \'I need to write a 10-page research paper in 7 days\''),
  userProfile: z.string().optional().describe('Real-time user profile, goals, and tasks.'),
  currentDate: z.string().describe('The current date, e.g., "June 18, 2024". This is the earliest date tasks should be scheduled for.'),
});
export type SmartTaskCreationInput = z.infer<typeof SmartTaskCreationInputSchema>;

const SmartTaskCreationOutputSchema = z.array(
  z.object({
    task: z.string().describe('The task to be completed.'),
    deadline: z.string().describe('The deadline for the task.'),
  })
);
export type SmartTaskCreationOutput = z.infer<typeof SmartTaskCreationOutputSchema>;

export async function smartTaskCreation(input: SmartTaskCreationInput): Promise<SmartTaskCreationOutput> {
  return smartTaskCreationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartTaskCreationPrompt',
  input: {schema: SmartTaskCreationInputSchema},
  output: {schema: SmartTaskCreationOutputSchema},
  prompt: `You are Nuvia, an intelligent task assistant. Your goal is to break down user requests into a list of actionable tasks, each with a realistic deadline.

User's Request: {{{request}}}
{{#if userProfile}}
User's Profile (for context): {{{userProfile}}}
{{/if}}
Current Date: {{{currentDate}}}

Instructions for Task Generation:
1.  **Analyze the Request**: Understand the user's goal and any explicit or implicit timeframes.
2.  **Task Breakdown**: Decompose the request into smaller, manageable tasks. Each task should be a clear action item.
3.  **Deadline Assignment**:
    *   Assign a specific deadline to each task (e.g., "June 20, 2024", "End of day", "Tomorrow morning").
    *   **Crucially, all task deadlines MUST be on or after the 'Current Date' ({{{currentDate}}}). Do NOT generate any tasks with deadlines before this date.**
    *   If the user's request implies a final deadline (e.g., "party by June 22", "report in 7 days"), ensure all generated tasks and their deadlines fit within that timeframe, culminating on or before the user's final deadline. Distribute tasks logically leading up to it.
    *   If no specific end date is given, create a reasonable schedule based on the tasks.
4.  **Output Format**: Return an array of objects, where each object has a "task" (string) and "deadline" (string).
    Example: [{"task": "Draft introduction", "deadline": "June 19, 2024"}, {"task": "Research competitors", "deadline": "June 20, 2024"}]
5.  **Short Deadline Note (Conditional)**:
    *   If the user's request implies a very short timeframe (e.g., the implied final deadline is less than 2 full days away from the 'Current Date'), AND you can only suggest a few steps (e.g., 1-3 actual tasks beyond this note), add a task at the very beginning of the list that says: "Note: Your deadline is very close, so only limited preparation steps are suggested." with a deadline of "{{{currentDate}}}".
    *   Otherwise, do not include this specific note.

Example of handling a short deadline:
User Request: "Help me prepare for my exam tomorrow!"
Current Date: "October 25, 2024"
Expected Output Structure (if only 1-2 actual tasks can be generated):
[
  {"task": "Note: Your deadline is very close, so only limited preparation steps are suggested.", "deadline": "October 25, 2024"},
  {"task": "Review key concepts for Chapter 1-3", "deadline": "October 25, 2024"},
  {"task": "Get a good night's sleep", "deadline": "October 25, 2024"}
]

Generate the tasks based on these instructions.`,
});

const smartTaskCreationFlow = ai.defineFlow(
  {
    name: 'smartTaskCreationFlow',
    inputSchema: SmartTaskCreationInputSchema,
    outputSchema: SmartTaskCreationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        // Fallback if AI returns nothing, to ensure it's an array.
        return [];
    }
    return output;
  }
);

