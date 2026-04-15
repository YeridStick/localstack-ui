import { NextRequest, NextResponse } from "next/server";
import { buildStudyCenterData, StudyDifficulty } from "@/lib/study/learning-center";

interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  source: string;
}

interface SourceFeed {
  source: string;
  url: string;
}

const FEEDS: SourceFeed[] = [
  {
    source: "AWS What's New",
    url: "https://aws.amazon.com/new/feed/",
  },
  {
    source: "AWS News Blog",
    url: "https://aws.amazon.com/blogs/aws/feed/",
  },
];

function cleanText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagValue(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(regex);
  return match?.[1]?.trim() || "";
}

function parseRssItems(xml: string, source: string, limit = 8): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const title = cleanText(extractTagValue(block, "title"));
    const link = cleanText(extractTagValue(block, "link"));
    const pubDate = cleanText(extractTagValue(block, "pubDate"));
    const description = cleanText(extractTagValue(block, "description"));

    if (!title || !link) continue;

    items.push({
      title,
      link,
      pubDate,
      description,
      source,
    });
  }

  return items;
}

async function fetchFeed(source: SourceFeed): Promise<FeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "localstack-ui-study-center/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return [];

    const xml = await response.text();
    return parseRssItems(xml, source.source);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function parseDifficulty(value: string | null): StudyDifficulty {
  if (value === "advanced") return "advanced";
  if (value === "intermediate") return "intermediate";
  return "beginner";
}

function toTimestamp(dateValue?: string): number {
  if (!dateValue) return 0;
  const parsed = Date.parse(dateValue);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const certificationGoal =
    search.get("certificationGoal") || "AWS Cloud Practitioner";
  const focusTopic = search.get("focusTopic") || "Fundamentos de AWS";
  const difficulty = parseDifficulty(search.get("difficulty"));

  const center = buildStudyCenterData({
    certificationGoal,
    focusTopic,
    difficulty,
  });

  const feeds = await Promise.all(FEEDS.map((feed) => fetchFeed(feed)));
  const updates = feeds
    .flat()
    .sort((a, b) => toTimestamp(b.pubDate) - toTimestamp(a.pubDate))
    .slice(0, 10);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    ...center,
    updates,
    sources: FEEDS,
  });
}
