import { Logger } from "./logger.js";

const logger = new Logger("WebSearch");

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export async function searchStackOverflow(query: string): Promise<SearchResult[]> {
  try {
    // In a real implementation, this would use Stack Exchange API
    // For now, returning mock data
    return [
      {
        title: "How to fix " + query.substring(0, 50),
        url: "https://stackoverflow.com/questions/example",
        snippet: "This error typically occurs when...",
        source: "StackOverflow",
      },
    ];
  } catch (error) {
    logger.error("Failed to search StackOverflow:", error);
    return [];
  }
}

export async function searchGitHubIssues(query: string): Promise<SearchResult[]> {
  try {
    // In a real implementation, this would use GitHub API
    // For now, returning mock data
    return [
      {
        title: "Issue: " + query.substring(0, 50),
        url: "https://github.com/example/repo/issues/123",
        snippet: "We encountered this issue when...",
        source: "GitHub",
      },
    ];
  } catch (error) {
    logger.error("Failed to search GitHub issues:", error);
    return [];
  }
}