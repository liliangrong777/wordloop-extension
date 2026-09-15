export function getReviewUrl(): string {
  const isEdge =
    import.meta.env.BROWSER === "edge" ||
    (typeof navigator !== "undefined" && /Edg\//.test(navigator.userAgent));

  if (isEdge) {
    return "https://microsoftedge.microsoft.com/addons/search?query=%E9%BB%98%E9%BB%98%E8%83%8C%E5%8D%95%E8%AF%8D";
  }

  return "https://chromewebstore.google.com/search/%E9%BB%98%E9%BB%98%E8%83%8C%E5%8D%95%E8%AF%8D";
}
