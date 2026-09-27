import {
  Utensils,
  Car,
  ShoppingBag,
  FileText,
  HeartPulse,
  GraduationCap,
  Tv,
  DollarSign,
  Coins,
} from 'lucide-react';

export const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Food':
      return Utensils;
    case 'Transport':
      return Car;
    case 'Shopping':
      return ShoppingBag;
    case 'Bills':
      return FileText;
    case 'Medicine':
      return HeartPulse;
    case 'Education':
      return GraduationCap;
    case 'Entertainment':
      return Tv;
    case 'Income':
      return Coins;
    default:
      return DollarSign;
  }
};

/** Soft tinted background + text color for a category chip or icon tile. */
export const getCategoryGlow = (category: string) => {
  switch (category) {
    case 'Food':
      return 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400';
    case 'Transport':
      return 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400';
    case 'Shopping':
      return 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400';
    case 'Bills':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
    case 'Medicine':
      return 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400';
    case 'Education':
      return 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400';
    case 'Entertainment':
      return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
    case 'Income':
      return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
    default:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400';
  }
};
