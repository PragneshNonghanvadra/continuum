export type NavigationItem = {
  id: "home" | "capture" | "inbox" | "library" | "topics" | "revision" | "search" | "ask-memory" | "settings";
  label: string;
};

export const navigationItems: NavigationItem[] = [
  { id: "home", label: "Home" },
  { id: "capture", label: "Capture" },
  { id: "inbox", label: "Inbox" },
  { id: "library", label: "Library" },
  { id: "topics", label: "Topics" },
  { id: "revision", label: "Revision" },
  { id: "search", label: "Search" },
  { id: "ask-memory", label: "Ask Memory" },
  { id: "settings", label: "Settings" }
];
