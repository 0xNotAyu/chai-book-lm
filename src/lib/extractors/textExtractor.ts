export async function extractText(textContent: string): Promise<string> {
  if (!textContent) {
    throw new Error("No text content provided");
  }
  return textContent.trim();
}