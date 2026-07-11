export function parseRss(xml) {
  return [...String(xml || "").matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item = match[1];
    return {
      title: decodeXml(readTag(item, "title")),
      url: decodeXml(readTag(item, "link")),
      snippet: stripHtml(decodeXml(readTag(item, "description"))),
      published_at: decodeXml(readTag(item, "pubDate")) || null,
      author: null
    };
  }).filter((item) => item.title && item.url);
}

export function parseAtom(xml) {
  return [...String(xml || "").matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((match) => {
    const entry = match[1];
    const link = entry.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
    const author = decodeXml(readTag(entry, "name"));
    return {
      title: decodeXml(readTag(entry, "title")),
      url: decodeXml(link),
      snippet: stripHtml(decodeXml(readTag(entry, "content") || readTag(entry, "summary"))),
      published_at: decodeXml(readTag(entry, "updated") || readTag(entry, "published")) || null,
      author: author || null
    };
  }).filter((item) => item.title && item.url);
}

function readTag(text, name) {
  return text.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]?.trim() || "";
}

function decodeXml(value) {
  return String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ({
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'"
  }[entity]));
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
