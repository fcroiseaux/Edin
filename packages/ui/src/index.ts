// Edin UI component library — shared design system primitives
// CSS paths for consumers:
// Design tokens: @import '@edin/ui/src/tokens/theme.css'
// Font faces:    @import '@edin/ui/src/fonts/abc-normal.css'

export { Button, type ButtonProps } from './primitives/button';
export { Input, type InputProps } from './primitives/input';
export { Textarea, type TextareaProps } from './primitives/textarea';
export { Card, type CardProps } from './primitives/card';
export { Badge, type BadgeProps, type Domain } from './primitives/badge';
export { Skeleton, type SkeletonProps } from './primitives/skeleton';
export { cn } from './lib/cn';

// Radix UI wrappers with ROSE theming
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuPortal,
  Popover,
  PopoverTrigger,
  PopoverContent,
  type PopoverContentProps,
  ScrollArea,
  ScrollBar,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsTriggerProps,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  type ToastProps,
  type ToastVariant,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  VisuallyHidden,
} from './radix';

// Layout containers
export {
  DashboardShell,
  type DashboardShellProps,
  SidebarNav,
  type SidebarNavProps,
  type NavItem,
  type NavSection,
  type LinkRenderProps,
  ReadingCanvas,
  type ReadingCanvasProps,
  HeroSection,
  type HeroSectionProps,
  PublicLayout,
  type PublicLayoutProps,
  type PublicNavItem,
} from './layout';

// Domain identity components
export {
  PillarAccentLine,
  type PillarAccentLineProps,
  DomainBadge,
  type DomainBadgeProps,
} from './domain';

// Content display components
export {
  NarrativeCard,
  type NarrativeCardProps,
  type NarrativeCardVariant,
  ArticleByline,
  type ArticleBylineProps,
  type BylineProfile,
  PullQuote,
  type PullQuoteProps,
  ActivityFeedItem,
  type ActivityFeedItemProps,
  StatusIndicator,
  type StatusIndicatorProps,
  type StatusState,
} from './content';
