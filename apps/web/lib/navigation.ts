export type NavigationIcon =
  | "LayoutDashboard"
  | "PenLine"
  | "Library"
  | "Database"
  | "Activity"
  | "Boxes"
  | "History"
  | "ClipboardCheck"
  | "Settings";

export type NavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: NavigationIcon;
};

export const mainNavigation: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview",
    icon: "LayoutDashboard",
  },
  {
    href: "/studio",
    label: "Studio",
    description: "Create stories",
    icon: "PenLine",
  },
  {
    href: "/stories",
    label: "Stories",
    description: "Library",
    icon: "Library",
  },
  {
    href: "/dataset",
    label: "Dataset",
    description: "Source writing",
    icon: "Database",
  },
  {
    href: "/training",
    label: "Training",
    description: "Runs",
    icon: "Activity",
  },
  {
    href: "/models",
    label: "Models",
    description: "Adapters",
    icon: "Boxes",
  },
  {
    href: "/history",
    label: "History",
    description: "Generations",
    icon: "History",
  },
  {
    href: "/evaluation",
    label: "Evaluation",
    description: "Quality checks",
    icon: "ClipboardCheck",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Preferences",
    icon: "Settings",
  },
];
