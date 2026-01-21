// Dashboard theme configuration for role-based styling
export type DashboardTheme = 'pharmacy' | 'individual' | 'lab' | 'wholesale' | 'default';

export interface ThemeConfig {
  // Background gradients
  bgGradient: string;
  bgGradientDark: string;
  // Header styling
  headerGradient: string;
  headerGradientDark: string;
  // Accent colors for cards/badges
  accentBg: string;
  accentBgDark: string;
  accentText: string;
  accentTextDark: string;
  // Icon background
  iconBg: string;
  iconBgDark: string;
}

export const dashboardThemes: Record<DashboardTheme, ThemeConfig> = {
  pharmacy: {
    bgGradient: 'from-teal-50/80 via-background to-amber-50/50',
    bgGradientDark: 'dark:from-teal-950/30 dark:via-background dark:to-amber-950/20',
    headerGradient: 'from-teal-600 to-teal-700',
    headerGradientDark: 'dark:from-teal-700 dark:to-teal-800',
    accentBg: 'bg-teal-100',
    accentBgDark: 'dark:bg-teal-900/50',
    accentText: 'text-teal-700',
    accentTextDark: 'dark:text-teal-300',
    iconBg: 'bg-teal-500/10',
    iconBgDark: 'dark:bg-teal-500/20',
  },
  individual: {
    bgGradient: 'from-emerald-50/80 via-background to-cyan-50/50',
    bgGradientDark: 'dark:from-emerald-950/30 dark:via-background dark:to-cyan-950/20',
    headerGradient: 'from-emerald-600 to-teal-600',
    headerGradientDark: 'dark:from-emerald-700 dark:to-teal-700',
    accentBg: 'bg-emerald-100',
    accentBgDark: 'dark:bg-emerald-900/50',
    accentText: 'text-emerald-700',
    accentTextDark: 'dark:text-emerald-300',
    iconBg: 'bg-emerald-500/10',
    iconBgDark: 'dark:bg-emerald-500/20',
  },
  lab: {
    bgGradient: 'from-indigo-50/80 via-background to-purple-50/50',
    bgGradientDark: 'dark:from-indigo-950/30 dark:via-background dark:to-purple-950/20',
    headerGradient: 'from-indigo-600 to-purple-600',
    headerGradientDark: 'dark:from-indigo-700 dark:to-purple-700',
    accentBg: 'bg-indigo-100',
    accentBgDark: 'dark:bg-indigo-900/50',
    accentText: 'text-indigo-700',
    accentTextDark: 'dark:text-indigo-300',
    iconBg: 'bg-indigo-500/10',
    iconBgDark: 'dark:bg-indigo-500/20',
  },
  wholesale: {
    bgGradient: 'from-blue-50/80 via-background to-teal-50/50',
    bgGradientDark: 'dark:from-blue-950/30 dark:via-background dark:to-teal-950/20',
    headerGradient: 'from-blue-600 to-teal-600',
    headerGradientDark: 'dark:from-blue-700 dark:to-teal-700',
    accentBg: 'bg-blue-100',
    accentBgDark: 'dark:bg-blue-900/50',
    accentText: 'text-blue-700',
    accentTextDark: 'dark:text-blue-300',
    iconBg: 'bg-blue-500/10',
    iconBgDark: 'dark:bg-blue-500/20',
  },
  default: {
    bgGradient: 'from-slate-50/80 via-background to-slate-100/50',
    bgGradientDark: 'dark:from-slate-950/30 dark:via-background dark:to-slate-900/20',
    headerGradient: 'from-slate-600 to-slate-700',
    headerGradientDark: 'dark:from-slate-700 dark:to-slate-800',
    accentBg: 'bg-slate-100',
    accentBgDark: 'dark:bg-slate-800',
    accentText: 'text-slate-700',
    accentTextDark: 'dark:text-slate-300',
    iconBg: 'bg-slate-500/10',
    iconBgDark: 'dark:bg-slate-500/20',
  },
};

export function getThemeClasses(theme: DashboardTheme = 'default') {
  const config = dashboardThemes[theme];
  return {
    background: `bg-gradient-to-br ${config.bgGradient} ${config.bgGradientDark}`,
    header: `bg-gradient-to-r ${config.headerGradient} ${config.headerGradientDark}`,
    accent: `${config.accentBg} ${config.accentBgDark} ${config.accentText} ${config.accentTextDark}`,
    iconBg: `${config.iconBg} ${config.iconBgDark}`,
  };
}
