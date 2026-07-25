import * as cheerio from "cheerio";

export async function extractWebsite(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Strip out non-readable elements
    $('script, style, noscript, iframe, img, svg, header, footer, nav').remove();
    
    // Extract the remaining text from the body and normalize the whitespace
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    
    if (!text) {
      throw new Error("No readable text found on the page");
    }
    
    return text;
  } catch (error) {
    console.error("Error scraping website:", error);
    throw new Error("Failed to extract text from website");
  }
}