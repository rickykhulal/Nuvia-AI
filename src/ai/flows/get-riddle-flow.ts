
'use server';
/**
 * @fileOverview Provides riddles for the "Play a Game with Nuvia" feature.
 *
 * - getRiddleGame - A function that returns a random riddle, attempting to exclude recently shown ones.
 * - GetRiddleInput - The input type for the getRiddleGame function.
 * - GetRiddleOutput - The return type for the getRiddleGame function, containing the riddle.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the structure for a riddle
interface Riddle {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Expanded predefined list of riddles
const riddles: Riddle[] = [
  { id: '1', question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", answer: "An echo", difficulty: "medium" },
  { id: '2', question: "What comes once in a minute, twice in a moment, but never in a thousand years?", answer: "The letter M", difficulty: "medium" },
  { id: '3', question: "I have keys but no locks. I have space but no room. You can enter but can’t go outside. What am I?", answer: "A keyboard", difficulty: "easy" },
  { id: '4', question: "What has an eye, but cannot see?", answer: "A needle", difficulty: "easy" },
  { id: '5', question: "What is full of holes but still holds water?", answer: "A sponge", difficulty: "easy" },
  { id: '6', question: "What is always in front of you but can’t be seen?", answer: "The future", difficulty: "medium" },
  { id: '7', question: "What has to be broken before you can use it?", answer: "An egg", difficulty: "easy" },
  { id: '8', question: "What has many teeth, but cannot bite?", answer: "A comb", difficulty: "easy" },
  { id: '9', question: "What is so fragile that saying its name breaks it?", answer: "Silence", difficulty: "medium" },
  { id: '10', question: "What can you catch, but not throw?", answer: "A cold", difficulty: "easy" },
  { id: '11', question: "What has an endless supply of letters, but starts empty?", answer: "A mailbox", difficulty: "medium" },
  { id: '12', question: "What is always coming, but never arrives?", answer: "Tomorrow", difficulty: "easy" },
  { id: '13', question: "What has one head, one foot, and four legs?", answer: "A bed", difficulty: "easy" },
  { id: '14', question: "What can travel around the world while staying in a corner?", answer: "A stamp", difficulty: "medium" },
  { id: '15', question: "What has cities, but no houses; forests, but no trees; and water, but no fish?", answer: "A map", difficulty: "medium" },
  { id: '16', question: "What has a neck without a head, a body without legs?", answer: "A bottle", difficulty: "easy" },
  { id: '17', question: "What building has the most stories?", answer: "A library", difficulty: "easy" },
  { id: '18', question: "What is taken before you get it?", answer: "Your picture", difficulty: "medium" },
  { id: '19', question: "What is lighter than a feather, but even the world's strongest person can’t hold it for five minutes?", answer: "Your breath", difficulty: "medium" },
  { id: '20', question: "What gets wetter the more it dries?", answer: "A towel", difficulty: "easy" },
  { id: '21', question: "I’m tall when I’m young, and I’m short when I’m old. What am I?", answer: "A candle", difficulty: "easy" },
  { id: '22', question: "What is at the end of a rainbow?", answer: "The letter W", difficulty: "medium" },
  { id: '23', question: "What has many rings but no fingers?", answer: "A telephone", difficulty: "easy" },
  { id: '24', question: "What goes up but never comes down?", answer: "Your age", difficulty: "easy" },
  { id: '25', question: "What has a thumb and four fingers but is not alive?", answer: "A glove", difficulty: "easy" },
];

// TOTAL_RIDDLES_COUNT is not exported anymore
const TOTAL_RIDDLES_COUNT = riddles.length;

const GetRiddleInputSchema = z.object({
  excludeIds: z.array(z.string()).optional().describe("An array of riddle IDs to exclude from selection."),
}).describe("Input for requesting a riddle.");
export type GetRiddleInput = z.infer<typeof GetRiddleInputSchema>;

const GetRiddleOutputSchema = z.object({
  id: z.string().describe("The unique identifier for the riddle."),
  question: z.string().describe("The riddle question."),
  answer: z.string().describe("The answer to the riddle. This should be kept hidden from the user by the client until they answer or give up."),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe("The difficulty level of the riddle."),
});
export type GetRiddleOutput = z.infer<typeof GetRiddleOutputSchema>;

// This defines the flow, but the actual logic is simple enough to be in the exported function directly.
// For consistency with other flows, we can wrap it.
const getRiddleFlow = ai.defineFlow(
  {
    name: 'getRiddleFlow',
    inputSchema: GetRiddleInputSchema,
    outputSchema: GetRiddleOutputSchema,
  },
  async (input) => {
    let availableRiddles = riddles;
    if (input.excludeIds && input.excludeIds.length > 0) {
      availableRiddles = riddles.filter(riddle => !input.excludeIds!.includes(riddle.id));
    }

    // If all riddles have been excluded, reset to the full list to allow cycling
    if (availableRiddles.length === 0) {
      availableRiddles = riddles;
    }

    const randomIndex = Math.floor(Math.random() * availableRiddles.length);
    const selectedRiddle = availableRiddles[randomIndex];
    return selectedRiddle;
  }
);

// Exported function that client calls
export async function getRiddleGame(input?: GetRiddleInput): Promise<GetRiddleOutput> {
    return getRiddleFlow(input || {});
}
