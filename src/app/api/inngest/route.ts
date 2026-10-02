import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processSource, generateArtifact } from "@/inngest/functions";

export const maxDuration = 300; // each *step* must finish within this on Vercel

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processSource, generateArtifact],
});