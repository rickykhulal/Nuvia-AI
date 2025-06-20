
'use server';
/**
 * @fileOverview Generates a detailed assignment plan using an advanced AI prompt, styled as a checklist.
 *
 * - generateAssignmentPlan - A function that handles the assignment plan generation.
 * - GenerateAssignmentPlanInput - The input type for the generateAssignmentPlan function.
 * - GenerateAssignmentPlanOutput - The return type for the generateAssignmentPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAssignmentPlanInputSchema = z.object({
  assignmentTopic: z.string().describe('The topic or title of the assignment.'),
  deadline: z.string().describe('The final deadline for the assignment (e.g., "October 26, 2024").'),
  currentDate: z.string().describe('The current date for planning context (e.g., "June 17, 2024")'),
});
export type GenerateAssignmentPlanInput = z.infer<typeof GenerateAssignmentPlanInputSchema>;

const GenerateAssignmentPlanOutputSchema = z.object({
  plan: z.string().describe('The detailed, Markdown-formatted assignment plan, styled as a checklist.'),
});
export type GenerateAssignmentPlanOutput = z.infer<typeof GenerateAssignmentPlanOutputSchema>;

export async function generateAssignmentPlan(input: GenerateAssignmentPlanInput): Promise<GenerateAssignmentPlanOutput> {
  return generateAssignmentPlanFlow(input);
}

const advancedPlannerPrompt = ai.definePrompt({
  name: 'checklistStyleAssignmentPlannerPrompt',
  input: {schema: GenerateAssignmentPlanInputSchema},
  output: {schema: GenerateAssignmentPlanOutputSchema},
  prompt: `You are Nuvia, a smart academic planner that creates interactive, checkbox-style task plans for student assignments.

Your primary goal is to create a plan *directly and exclusively related* to the \`{{assignmentTopic}}\` provided by the user. Do not deviate to other topics.
When a user gives you an assignment topic (e.g., "{{assignmentTopic}}"), a deadline (e.g., "{{deadline}}"), and the current date (e.g., "{{currentDate}}"), you must:
1. Break the assignment timeline into **phases** from the {{currentDate}} until the {{deadline}}.
2. For each phase, include:
   - A short title for the phase.
   - A single sentence **goal** directly relevant to completing the \`{{assignmentTopic}}\`.
   - 2–4 **short actionable subtasks** that are *specifically tailored* to the \`{{assignmentTopic}}\`. For example, if the topic is "Education Loan", subtasks should be about researching loan options, understanding terms, etc., not generic academic tasks. Write them like checklist items, e.g., "- [ ] Research different types of education loans for {{assignmentTopic}}" or "- [ ] Outline the application process for an {{assignmentTopic}}". Ensure dates for each phase are logically sequenced between {{currentDate}} and {{deadline}}.
3. Avoid long descriptions or essay-like writing. Keep it **clean, short, structured**, and ready to display with checkboxes.
4. Include the current date and final deadline at the top of the plan.
5. Format output like this example (adapt content and dates based on user input, ensuring *all content is about {{assignmentTopic}}*):

---

## 📘 Assignment Plan: {{assignmentTopic}}

**Today's Date:** {{currentDate}}
**Deadline:** {{deadline}}

---

### ✅ Phase 1: Research the Topic – [Calculated Date 1, e.g., use {{currentDate}} if phase starts immediately]
**Goal:** Gather initial understanding and sources for "{{assignmentTopic}}".
- [ ] Read the assignment brief carefully for "{{assignmentTopic}}".
- [ ] Search and bookmark 3 relevant articles or official websites regarding "{{assignmentTopic}}".
- [ ] Watch 1-2 short videos explaining key concepts of "{{assignmentTopic}}".
- [ ] Write down 3 main questions the assignment on "{{assignmentTopic}}" should answer.

---

### ✅ Phase 2: Outline & Plan – [Calculated Date 2]
**Goal:** Build a clear structure for the assignment on "{{assignmentTopic}}".
- [ ] Create a title and introduction outline for "{{assignmentTopic}}".
- [ ] Divide the body into 3-4 sections by theme for "{{assignmentTopic}}".
- [ ] Choose citation style (APA/MLA) if applicable for "{{assignmentTopic}}".
- [ ] Plan a draft timeline based on sections for "{{assignmentTopic}}".

---

### ✅ Phase 3: Draft the Assignment – [Calculated Date 3 through Calculated Date 4]
**Goal:** Write and organize all content for "{{assignmentTopic}}".
- [ ] Write the introduction and thesis statement for "{{assignmentTopic}}".
- [ ] Draft each section with supporting facts and evidence for "{{assignmentTopic}}".
- [ ] Add citations and data examples as you write for "{{assignmentTopic}}".

---
(continue similarly with more phases like "Revision & Feedback" and "Final Polish & Submission" until the final day, ensuring the last phase aligns with the {{deadline}} and all tasks are specific to "{{assignmentTopic}}".)

---

Do not write long academic paragraphs. Stay structured, short, and formatted like a to-do list or checklist.
Use '##' for the main assignment plan title and '###' for phase titles.
`,
  config: {
    temperature: 0.4, 
  }
});

const generateAssignmentPlanFlow = ai.defineFlow(
  {
    name: 'generateAssignmentPlanFlow',
    inputSchema: GenerateAssignmentPlanInputSchema,
    outputSchema: GenerateAssignmentPlanOutputSchema,
  },
  async (input) => {
    const {output} = await advancedPlannerPrompt(input);
    if (!output) {
        throw new Error("AI failed to generate an assignment plan.");
    }
    return output;
  }
);

