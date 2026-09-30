import { localizeDigits as d } from '@/lib/format';

// Server-generated finance text: category names, analysis periods, rule-based
// insights and monthly-report highlights. Money / dates / percentages arrive
// already formatted for the locale; only counts are localized here.

const bnN = (n: number) => d(n, 'bn');

export const en = {
  // Stored category values are English; these are display names only
  categories: {
    Food: 'Food',
    Transport: 'Transport',
    Shopping: 'Shopping',
    Bills: 'Bills',
    Medicine: 'Medicine',
    Education: 'Education',
    Entertainment: 'Entertainment',
    Others: 'Others',
    Income: 'Income',
  } as Record<string, string>,

  periods: {
    presets: {
      today: 'Today',
      week: 'This week',
      month: 'This month',
      'last-month': 'Last month',
      '3m': 'Last 3 months',
      '6m': 'Last 6 months',
      year: 'This year',
      custom: 'Custom range',
    },
    thisWeekLabel: (span: string) => `This week (${span})`,
    lastNMonthsLabel: (n: number, span: string) => `Last ${n} months (${span})`,
    prev: {
      yesterday: 'yesterday',
      lastWeek: 'last week',
      previousNMonths: (n: number) => `the previous ${n} months`,
      previousPeriod: 'the previous period',
    },
    // Used inside sentences: "You spent ৳X {phrase}."
    phrase: {
      today: 'today',
      week: 'this week',
      month: 'this month',
      year: 'this year',
      inMonth: (label: string) => `in ${label}`,
      lastNMonths: (n: number) => `over the last ${n} months`,
      period: 'in this period',
    },
  },

  insights: {
    title: 'Financial insights',
    subtitle: 'Based on your recorded transactions',
    dashboardSubtitle: 'This month compared with last month',
    emptyTitle: 'No insights yet',
    emptyBody: 'Record a few transactions and insights about your spending will appear here.',
    vs: (change: string, prev: string) => `${change} vs ${prev}`,
    cashflowNegative: {
      title: 'Expenses exceeded income',
      message: (amount: string, period: string) => `You spent ${amount} more than you earned ${period}.`,
      metric: (pct: string) => `${pct} of income spent`,
    },
    cashflowPositive: {
      title: 'Positive cash flow',
      message: (amount: string, period: string) => `You had a positive net cash flow of ${amount} ${period}.`,
      metric: (pct: string) => `Expenses were ${pct} of income`,
    },
    overdueLending: {
      title: 'Overdue repayments',
      message: (n: number) => `${n} lending record${n === 1 ? ' is' : 's are'} past the due date.`,
      metric: (amount: string) => `${amount} receivable in total`,
    },
    overdueBorrowing: {
      title: 'Overdue payments',
      message: (n: number) => `You have ${n} borrowing record${n === 1 ? '' : 's'} past the due date.`,
      metric: (amount: string) => `${amount} payable in total`,
    },
    spendingUp: 'Spending increased',
    spendingDown: 'Spending decreased',
    spendingChange: (amount: string, up: boolean, prev: string) =>
      `You spent ${amount} ${up ? 'more' : 'less'} compared with ${prev}.`,
    categoryUp: {
      title: (cat: string) => `${cat} spending increased`,
      message: (amount: string, cat: string, prev: string) => `You spent ${amount} more on ${cat} compared with ${prev}.`,
    },
    categoryDown: {
      title: (cat: string) => `${cat} spending decreased`,
      message: (amount: string, cat: string, prev: string) => `You spent ${amount} less on ${cat} compared with ${prev}.`,
    },
    unusualDay: {
      title: 'Unusually high spending',
      message: (amount: string, day: string) => `You spent ${amount} on ${day}.`,
      metric: (multiple: string) => `${multiple}× your average spending day`,
    },
    incomeUp: 'Income increased',
    incomeDown: 'Income decreased',
    incomeChange: (amount: string, up: boolean, prev: string) =>
      `Your income ${up ? 'increased' : 'decreased'} by ${amount} compared with ${prev}.`,
    receivable: {
      title: 'Money owed to you',
      message: (amount: string) => `You currently have ${amount} receivable from others.`,
    },
    payable: {
      title: 'Money you owe',
      message: (amount: string) => `You currently owe ${amount} to others.`,
    },
    activeRecords: (n: number) => `${n} active record${n === 1 ? '' : 's'}`,
    topCategory: {
      title: (cat: string) => `${cat} is your top category`,
      message: (cat: string, pct: string, period: string) => `${cat} accounts for ${pct} of your spending ${period}.`,
    },
    avgDaily: {
      title: 'Average daily spending',
      message: (amount: string, period: string) => `You spent ${amount} per day on average ${period}.`,
    },
    expenses: (n: number) => `${n} expense${n === 1 ? '' : 's'}`,
  },

  highlights: {
    topCategory: (cat: string, amount: string, pct: string) =>
      `${cat} was your highest spending category (${amount}, ${pct}).`,
    topDay: (day: string, amount: string) => `${day} was your highest spending day (${amount}).`,
    largestExpense: (amount: string, title: string) => `Your largest expense was ${amount} — ${title}.`,
    avgDaily: (amount: string) => `Average daily expense was ${amount}.`,
    transactions: (n: number, income: string, expense: string) =>
      `${n} transaction${n === 1 ? '' : 's'}: ${income} income and ${expense} expenses.`,
    netPositive: (amount: string) => `Net cash flow was positive: ${amount}.`,
    netNegative: (amount: string) => `Net cash flow was negative: expenses exceeded income by ${amount}.`,
    lendBorrow: (signed: string) =>
      `Lend & borrow moved ${signed} through your balance (not counted as income or expense).`,
  },
};

type FinanceMessages = typeof en;

export const bn: FinanceMessages = {
  categories: {
    Food: 'খাবার',
    Transport: 'যাতায়াত',
    Shopping: 'কেনাকাটা',
    Bills: 'বিল',
    Medicine: 'ওষুধ',
    Education: 'শিক্ষা',
    Entertainment: 'বিনোদন',
    Others: 'অন্যান্য',
    Income: 'আয়',
  },

  periods: {
    presets: {
      today: 'আজ',
      week: 'এই সপ্তাহ',
      month: 'এই মাস',
      'last-month': 'গত মাস',
      '3m': 'গত ৩ মাস',
      '6m': 'গত ৬ মাস',
      year: 'এই বছর',
      custom: 'নিজের মতো সময়',
    },
    thisWeekLabel: (span) => `এই সপ্তাহ (${span})`,
    lastNMonthsLabel: (n, span) => `গত ${bnN(n)} মাস (${span})`,
    prev: {
      yesterday: 'গতকাল',
      lastWeek: 'গত সপ্তাহ',
      previousNMonths: (n) => `আগের ${bnN(n)} মাস`,
      previousPeriod: 'আগের সময়',
    },
    phrase: {
      today: 'আজ',
      week: 'এই সপ্তাহে',
      month: 'এই মাসে',
      year: 'এই বছরে',
      inMonth: (label) => `${label}-এ`,
      lastNMonths: (n) => `গত ${bnN(n)} মাসে`,
      period: 'এই সময়ে',
    },
  },

  insights: {
    title: 'আর্থিক পর্যবেক্ষণ',
    subtitle: 'আপনার লেখা লেনদেনের ভিত্তিতে',
    dashboardSubtitle: 'এই মাস বনাম গত মাস',
    emptyTitle: 'এখনো কোনো পর্যবেক্ষণ নেই',
    emptyBody: 'কয়েকটি লেনদেন লিখুন, আপনার খরচ নিয়ে পর্যবেক্ষণ এখানে দেখাবে।',
    vs: (change, prev) => `${prev}-এর তুলনায় ${change}`,
    cashflowNegative: {
      title: 'আয়ের চেয়ে খরচ বেশি',
      message: (amount, period) => `${period} আপনি আয়ের চেয়ে ${amount} বেশি খরচ করেছেন।`,
      metric: (pct) => `আয়ের ${pct} খরচ হয়েছে`,
    },
    cashflowPositive: {
      title: 'ইতিবাচক নগদ প্রবাহ',
      message: (amount, period) => `${period} আপনার নিট নগদ প্রবাহ ${amount} ইতিবাচক ছিল।`,
      metric: (pct) => `খরচ ছিল আয়ের ${pct}`,
    },
    overdueLending: {
      title: 'মেয়াদোত্তীর্ণ পাওনা',
      message: (n) => `${bnN(n)}টি ধারের রেকর্ডের নির্ধারিত তারিখ পার হয়ে গেছে।`,
      metric: (amount) => `মোট পাওনা ${amount}`,
    },
    overdueBorrowing: {
      title: 'মেয়াদোত্তীর্ণ দেনা',
      message: (n) => `আপনার ${bnN(n)}টি দেনার রেকর্ডের নির্ধারিত তারিখ পার হয়ে গেছে।`,
      metric: (amount) => `মোট দেনা ${amount}`,
    },
    spendingUp: 'খরচ বেড়েছে',
    spendingDown: 'খরচ কমেছে',
    spendingChange: (amount, up, prev) => `${prev}-এর তুলনায় আপনি ${amount} ${up ? 'বেশি' : 'কম'} খরচ করেছেন।`,
    categoryUp: {
      title: (cat) => `${cat} খাতে খরচ বেড়েছে`,
      message: (amount, cat, prev) => `${prev}-এর তুলনায় ${cat} খাতে ${amount} বেশি খরচ করেছেন।`,
    },
    categoryDown: {
      title: (cat) => `${cat} খাতে খরচ কমেছে`,
      message: (amount, cat, prev) => `${prev}-এর তুলনায় ${cat} খাতে ${amount} কম খরচ করেছেন।`,
    },
    unusualDay: {
      title: 'অস্বাভাবিক বেশি খরচ',
      message: (amount, day) => `${day} তারিখে আপনি ${amount} খরচ করেছেন।`,
      metric: (multiple) => `গড় খরচের দিনের ${multiple} গুণ`,
    },
    incomeUp: 'আয় বেড়েছে',
    incomeDown: 'আয় কমেছে',
    incomeChange: (amount, up, prev) => `${prev}-এর তুলনায় আপনার আয় ${amount} ${up ? 'বেড়েছে' : 'কমেছে'}।`,
    receivable: {
      title: 'আপনার পাওনা টাকা',
      message: (amount) => `অন্যদের কাছে বর্তমানে আপনার ${amount} পাওনা আছে।`,
    },
    payable: {
      title: 'আপনার দেনা টাকা',
      message: (amount) => `বর্তমানে অন্যদের কাছে আপনার ${amount} দেনা আছে।`,
    },
    activeRecords: (n) => `${bnN(n)}টি চলমান রেকর্ড`,
    topCategory: {
      title: (cat) => `${cat} আপনার সবচেয়ে বড় খাত`,
      message: (cat, pct, period) => `${period} আপনার মোট খরচের ${pct} গেছে ${cat} খাতে।`,
    },
    avgDaily: {
      title: 'দৈনিক গড় খরচ',
      message: (amount, period) => `${period} আপনি দিনে গড়ে ${amount} খরচ করেছেন।`,
    },
    expenses: (n) => `${bnN(n)}টি খরচ`,
  },

  highlights: {
    topCategory: (cat, amount, pct) => `সবচেয়ে বেশি খরচ হয়েছে ${cat} খাতে (${amount}, ${pct})।`,
    topDay: (day, amount) => `সবচেয়ে বেশি খরচের দিন ছিল ${day} (${amount})।`,
    largestExpense: (amount, title) => `সবচেয়ে বড় খরচ ছিল ${amount} — ${title}।`,
    avgDaily: (amount) => `দৈনিক গড় খরচ ছিল ${amount}।`,
    transactions: (n, income, expense) => `${bnN(n)}টি লেনদেন: আয় ${income} এবং খরচ ${expense}।`,
    netPositive: (amount) => `নিট নগদ প্রবাহ ইতিবাচক ছিল: ${amount}।`,
    netNegative: (amount) => `নিট নগদ প্রবাহ নেতিবাচক ছিল: আয়ের চেয়ে খরচ ${amount} বেশি।`,
    lendBorrow: (signed) => `ধার ও দেনার কারণে আপনার ব্যালেন্সে ${signed} পরিবর্তন হয়েছে (আয় বা খরচ হিসেবে ধরা হয়নি)।`,
  },
};
