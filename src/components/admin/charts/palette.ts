// Shared brand color palette for admin dashboard charts.
// Primary green (#2E8B57) and secondary green (#228B22) are used for
// registration/count series; orange and red round out categorical scales
// (e.g. pie slices) using the CleanCall brand accents.

export const CHART_COLORS = {
  primary: "#2E8B57", // sea green — primary series
  secondary: "#228B22", // forest green — secondary series
  accent: "#FF6B35", // brand orange
  danger: "#DC3545", // brand red
} as const;

// Categorical scale for pie charts and multi-category series, ordered so the
// brand greens lead and the warm accents follow.
export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
  CHART_COLORS.danger,
] as const;
