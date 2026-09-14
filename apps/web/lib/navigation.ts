export type NavigationIcon =
  | "MessageSquare"
  | "GraduationCap"
  | "Library"
  | "Settings";

export type NavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: NavigationIcon;
};

export const mainNavigation: NavigationItem[] = [
  {
    href: "/chat",
    label: "AI Story Chat",
    description: "Generate & Chat with AI",
    icon: "MessageSquare",
  },
  {
    href: "/train",
    label: "Train AI",
    description: "Train Model with Stories",
    icon: "GraduationCap",
  },
  {
    href: "/stories",
    label: "Story Library",
    description: "Saved Stories",
    icon: "Library",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Preferences & Reset",
    icon: "Settings",
  },
];
