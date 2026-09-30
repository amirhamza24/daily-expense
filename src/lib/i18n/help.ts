import type { Locale } from './config';

/*
 * Help Center content (used only by /help, so it stays out of the shared
 * messages bundle). Inline markup: **bold**, _italic_, `code`.
 */

export type HelpBlock =
  | { type: 'p'; text: string }
  | { type: 'h4'; text: string; icon: HelpIcon; tone: string }
  | { type: 'sub'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'info' | 'warning' | 'success'; text: string }
  | { type: 'table'; headers: [string, string]; rows: Array<[string, string]> }
  | { type: 'shot'; label: string }
  | { type: 'faq'; items: Array<{ q: string; a: string }> };

export type HelpIcon =
  | 'mail'
  | 'shield'
  | 'login'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'filter'
  | 'download'
  | 'users';

export interface HelpSection {
  id: string;
  title: string;
  blocks: HelpBlock[];
}

export interface HelpContent {
  title: string;
  description: string;
  manualTitle: string;
  manualHint: string;
  manualButton: string;
  sectionsHint: (n: number) => string;
  expandAll: string;
  collapseAll: string;
  footer: string;
  screenshotHint: string;
  question: string;
  sections: HelpSection[];
}

const en: HelpContent = {
  title: 'Help Center',
  description: 'Complete guide to using Expensify — from account creation to advanced features.',
  manualTitle: 'Full User Manual (Markdown)',
  manualHint: 'Download the complete reference document for offline reading.',
  manualButton: 'Download Manual',
  sectionsHint: (n) => `${n} sections — click any title to expand`,
  expandAll: 'Expand All',
  collapseAll: 'Collapse All',
  footer: 'Expensify v1.0 · For support contact your system administrator',
  screenshotHint: 'Place screenshot at /public/screenshots/',
  question: 'Q:',
  sections: [
    {
      id: 'getting-started',
      title: 'Getting Started',
      blocks: [
        { type: 'h4', text: 'Step 1 — Register an Account', icon: 'mail', tone: 'text-accent-fg' },
        {
          type: 'steps',
          items: [
            'Go to the app. You will be redirected to the **Login** page.',
            'Click **"Don\'t have an account? Create one"** at the bottom.',
            'Fill in your **Full Name**, **Email Address**, and **Password** (min 6 characters).',
            'Click **"Create Account"**. A verification email will be sent instantly.',
          ],
        },
        { type: 'shot', label: 'Screenshot: Registration Form' },
        { type: 'h4', text: 'Step 2 — Verify Your Email', icon: 'mail', tone: 'text-blue-400' },
        {
          type: 'steps',
          items: [
            'Check your email inbox for a message from Expensify.',
            'The email contains a **6-digit verification code**.',
            'Enter the 6 digits on the verification page and click **"Verify Email"**.',
          ],
        },
        {
          type: 'warning',
          text: 'Codes expire in **2 minutes**. Click "Resend Code" if yours expired. Wait 120 seconds between resend attempts.',
        },
        { type: 'shot', label: 'Screenshot: Email Verification Page' },
        { type: 'h4', text: 'Step 3 — Wait for Admin Approval', icon: 'shield', tone: 'text-amber-400' },
        {
          type: 'p',
          text: 'After email verification your account status is **PENDING**. An administrator must approve it before you can log in. Simply try logging in again after a short wait.',
        },
        { type: 'h4', text: 'Step 4 — Log In', icon: 'login', tone: 'text-emerald-400' },
        {
          type: 'steps',
          items: [
            'Go to the **Login** page.',
            'Enter your **email** and **password**.',
            'Click **"Sign In"**. You will land on your Dashboard.',
          ],
        },
        {
          type: 'table',
          headers: ['Error Message', 'Cause'],
          rows: [
            ['Account not verified', 'Email OTP step not completed'],
            ['Account pending approval', "Admin hasn't approved yet"],
            ['Account suspended', 'Admin suspended your account'],
            ['Account rejected', 'Admin rejected your registration'],
            ['Invalid credentials', 'Wrong email or password'],
          ],
        },
        { type: 'shot', label: 'Screenshot: Login Page' },
      ],
    },
    {
      id: 'budget-setup',
      title: 'Setting Up Your Budget',
      blocks: [
        {
          type: 'p',
          text: 'Before tracking expenses, set your **initial balance** (your total budget). This is the ceiling your remaining balance counts down from.',
        },
        {
          type: 'steps',
          items: [
            'On the **Dashboard**, click the **"Set Balance"** button in the top area.',
            'Enter your **Total Balance** amount (e.g., `5000`).',
            'Add a **Note** describing the source (e.g., _Monthly salary_).',
            'Click **"Save changes"**. Your dashboard now shows the total and remaining balance.',
          ],
        },
        {
          type: 'info',
          text: 'You can update your balance anytime. The remaining balance recalculates automatically from your transactions.',
        },
        { type: 'shot', label: 'Screenshot: Set Balance Modal' },
      ],
    },
    {
      id: 'dashboard',
      title: 'Dashboard Overview',
      blocks: [
        { type: 'p', text: 'The **Dashboard** is your home screen — a complete financial overview at a glance.' },
        { type: 'shot', label: 'Screenshot: Dashboard Overview' },
        {
          type: 'table',
          headers: ['Section', 'Description'],
          rows: [
            ['Available Balance', "What's left after all recorded transactions"],
            ['Total Expenses', 'Every expense since account creation'],
            ["This Month's Expenses", 'Sum of expenses this calendar month'],
            ['Today', 'All expenses recorded today'],
            ['Financial Insights', 'This month compared with last month'],
            ['Lend & Borrow', 'Money owed to you and by you'],
            ['Recent Transactions', 'Your latest 5 entries with edit/delete buttons'],
            ['Month Summary', 'Money in vs. money out this month'],
          ],
        },
        {
          type: 'success',
          text: 'From the dashboard you can directly **add a new transaction** using the "New transaction" button.',
        },
      ],
    },
    {
      id: 'expenses',
      title: 'Managing Expenses',
      blocks: [
        { type: 'shot', label: 'Screenshot: Expenses Page' },
        { type: 'h4', text: 'Adding an Expense', icon: 'plus', tone: 'text-emerald-400' },
        {
          type: 'steps',
          items: [
            'Click **"New transaction"** (Expenses page or Dashboard).',
            'Fill in the form: **Title**, **Amount**, **Category**, **Date**, and an optional **Note**. You can also split one expense into several reasons with **Breakdown**.',
            'Click **"Record expense"**. Your remaining balance updates immediately.',
          ],
        },
        {
          type: 'warning',
          text: 'If your remaining balance is less than the expense amount, the system will block the transaction with an error.',
        },
        { type: 'shot', label: 'Screenshot: Add Expense Modal' },
        { type: 'h4', text: 'Editing an Expense', icon: 'edit', tone: 'text-blue-400' },
        {
          type: 'steps',
          items: [
            'Click the **pencil icon** on any expense row.',
            'The modal opens pre-filled. Change the fields you need.',
            'Click **"Save changes"**. Balance recalculates based on the difference.',
          ],
        },
        { type: 'h4', text: 'Deleting an Expense', icon: 'trash', tone: 'text-rose-400' },
        {
          type: 'steps',
          items: [
            'Click the **trash icon** on the expense row.',
            'A **confirmation dialog** appears. Read it before confirming.',
            'Click **"Delete"** to confirm. The amount is restored to your balance.',
          ],
        },
        { type: 'warning', text: 'Deletion is **permanent** and cannot be undone.' },
        { type: 'h4', text: 'Filtering & Searching', icon: 'filter', tone: 'text-accent-fg' },
        {
          type: 'table',
          headers: ['Filter', 'How to Use'],
          rows: [
            ['Search', 'Type any word from the expense title'],
            ['Category', 'Select a specific category from the dropdown'],
            ['Date Range', 'Today / Yesterday / Last 7 days / This Month / Custom'],
            ['Sort', 'Sort by Newest first or Highest amount'],
          ],
        },
        { type: 'h4', text: 'Exporting to CSV', icon: 'download', tone: 'text-teal-400' },
        {
          type: 'steps',
          items: [
            'Apply any filters to narrow the data you want.',
            'Click the **"Export"** button — exports _all matching records_, not just the visible page.',
            'A `.csv` file downloads. Open in Excel or Google Sheets.',
          ],
        },
      ],
    },
    {
      id: 'income',
      title: 'Recording Income',
      blocks: [
        { type: 'p', text: 'Income is a special transaction that **adds to your balance** instead of deducting from it.' },
        {
          type: 'steps',
          items: [
            'Click **"New transaction"**.',
            'Choose the **"Income"** tab at the top of the form.',
            'Fill in the source (e.g., _Freelance payment_), amount, and date.',
            'Save — your remaining balance **increases** by that amount.',
          ],
        },
        {
          type: 'info',
          text: 'Income entries appear in Analytics and in the monthly "Money in" total on the Dashboard.',
        },
      ],
    },
    {
      id: 'transaction-history',
      title: 'Transaction History',
      blocks: [
        {
          type: 'p',
          text: 'The **Transaction History** page shows a complete chronological ledger of every transaction — including lend & borrow — with a running balance column.',
        },
        { type: 'shot', label: 'Screenshot: Transaction History' },
        {
          type: 'table',
          headers: ['Column', 'Description'],
          rows: [
            ['Date', 'When the transaction was recorded'],
            ['Transaction', 'Name/description of the transaction'],
            ['Category', 'Transaction category'],
            ['Type badge', 'Green = Credit, Red = Debit'],
            ['Amount', 'Transaction value'],
            ['Balance', 'Your balance after this specific transaction'],
          ],
        },
        { type: 'info', text: 'This view is **read-only**. To edit or delete, go to the Expenses page.' },
      ],
    },
    {
      id: 'analytics',
      title: 'Analytics & Charts',
      blocks: [
        {
          type: 'p',
          text: 'The **Analytics** page gives you visual insights into your spending habits through interactive charts, for any period you choose.',
        },
        { type: 'shot', label: 'Screenshot: Analytics Charts' },
        {
          type: 'table',
          headers: ['Chart / Section', 'What It Shows'],
          rows: [
            ['Overview', 'Balance, income, expenses, net flow, lend & borrow'],
            ['Income vs expenses', 'This period compared with the previous one'],
            ['Trend', 'Daily, weekly or monthly expenses, income or net flow'],
            ['Top spending categories', 'Share of each category in your expenses'],
            ['Category comparison', 'Each category, this period vs the previous one'],
            ['Spending statistics', 'Averages, highest and lowest days, largest expense'],
          ],
        },
      ],
    },
    {
      id: 'profile',
      title: 'Profile & Password',
      blocks: [
        { type: 'p', text: 'The **Profile** page shows your account details and lets you change your password.' },
        { type: 'shot', label: 'Screenshot: Profile Page' },
        {
          type: 'table',
          headers: ['Field', 'Description'],
          rows: [
            ['Full Name & Email', 'Your registered identity'],
            ['Role', 'User or Admin'],
            ['Account Status', 'Approved / Pending / Suspended / Rejected'],
            ['Member Since', 'Your registration date'],
            ['Approved By', "Admin's name and when approval was granted"],
          ],
        },
        { type: 'sub', text: 'Changing Your Password' },
        {
          type: 'steps',
          items: [
            'Click **"Change password"** on the profile page.',
            'Enter your **Current Password**, then **New Password** (min 6 characters), then **Confirm New Password**.',
            'Click **"Update password"**. Use the new password on next login.',
          ],
        },
        { type: 'sub', text: 'Forgot Your Password?' },
        {
          type: 'steps',
          items: [
            'On the **Login** page, click **"Forgot password?"**.',
            'Enter your email — a **6-digit reset code** is sent to it (valid for 10 minutes).',
            'Enter the code and your new password, then click **"Reset password"**.',
          ],
        },
      ],
    },
    {
      id: 'settings',
      title: 'Settings',
      blocks: [
        { type: 'shot', label: 'Screenshot: Settings Page' },
        {
          type: 'table',
          headers: ['Setting', 'Description'],
          rows: [
            ['Theme', 'Light or dark appearance, saved on this device'],
            ['Language', 'English or বাংলা — text, numbers and dates, saved on this device'],
            ['In-app alerts', 'Toggle success/error popup notifications on/off'],
            ['Weekly digest', 'Toggle for summary email feature'],
            ['Reset ledger', 'Deletes ALL expenses and resets balance to zero'],
            ['Sign out', 'Logs you out of the application'],
          ],
        },
        {
          type: 'warning',
          text: '**Reset ledger** is irreversible. All expense records and balance will be permanently deleted.',
        },
      ],
    },
    {
      id: 'admin',
      title: 'Admin Guide',
      blocks: [
        {
          type: 'info',
          text: 'Admin features are only visible to users with the **Admin** role. Look for the "Admin" group in the sidebar.',
        },
        { type: 'h4', text: 'Admin Overview', icon: 'shield', tone: 'text-rose-400' },
        { type: 'shot', label: 'Screenshot: Admin Dashboard' },
        {
          type: 'table',
          headers: ['Metric', 'Description'],
          rows: [
            ['Total users', 'All registered users in the system'],
            ['Expenses logged', 'Sum of all expenses across all users'],
            ['Pending approval', 'Users waiting for account approval'],
            ['Accounts by status', 'Approved, pending, suspended and rejected counts'],
          ],
        },
        { type: 'h4', text: 'Managing Users', icon: 'users', tone: 'text-rose-400' },
        { type: 'shot', label: 'Screenshot: User Registry' },
        { type: 'sub', text: 'Approving a New User' },
        {
          type: 'steps',
          items: [
            'Find the user with **Pending** status.',
            'Click **"Approve"** and confirm.',
            'User status changes to **Approved** — they can now log in.',
          ],
        },
        { type: 'sub', text: 'Suspending an Active User' },
        {
          type: 'steps',
          items: [
            'Find the **Approved** user.',
            'Click the **suspend** button and confirm. The user is immediately blocked — even mid-session.',
          ],
        },
        { type: 'sub', text: 'Changing User Role' },
        {
          type: 'steps',
          items: ['Find an **Approved** user.', 'Choose **Admin** or **User** in the Role dropdown and confirm.'],
        },
        {
          type: 'warning',
          text: 'You **cannot remove your own admin role**. This prevents accidental lockout.',
        },
      ],
    },
    {
      id: 'faq',
      title: 'FAQ & Troubleshooting',
      blocks: [
        {
          type: 'faq',
          items: [
            {
              q: "I registered but can't log in.",
              a: 'Your account needs email verification AND admin approval. Check that you completed the 6-digit OTP step, then wait for admin approval.',
            },
            {
              q: 'My verification code expired.',
              a: "Codes expire in 2 minutes. Click 'Resend Code' on the verification page. You must wait at least 120 seconds between resend requests.",
            },
            {
              q: "I can't add an expense — balance error.",
              a: 'Your remaining balance is less than the expense amount. Reduce the amount, delete old expenses to free up balance, or update your starting balance.',
            },
            {
              q: 'I accidentally deleted an expense.',
              a: 'Deletions are permanent and cannot be recovered. Always confirm carefully before deleting.',
            },
            {
              q: 'My dashboard shows ৳0 remaining balance.',
              a: "You haven't set a balance yet. Set your starting balance and enter your budget amount.",
            },
            {
              q: 'I forgot my password.',
              a: "Click 'Forgot password?' on the login page, enter your email, and use the 6-digit code we send you to choose a new password.",
            },
            {
              q: 'Does Expensify work on mobile?',
              a: 'Yes — fully responsive. On mobile, the sidebar becomes a menu button in the top navigation bar.',
            },
            {
              q: 'How do I switch the language to Bangla?',
              a: "Open Settings → Language and choose 'বাংলা'. Text, numbers and dates switch immediately.",
            },
            {
              q: "As admin, why can't I demote myself?",
              a: 'Safety feature to prevent accidental lockout. Another admin must change your role if needed.',
            },
          ],
        },
      ],
    },
    {
      id: 'categories',
      title: 'Expense Categories Reference',
      blocks: [
        {
          type: 'table',
          headers: ['Category', 'Use For'],
          rows: [
            ['Food', 'Meals, groceries, snacks, restaurants'],
            ['Transport', 'Fuel, bus fare, ride-sharing, parking'],
            ['Shopping', 'Clothes, electronics, household items'],
            ['Bills', 'Electricity, water, internet, rent'],
            ['Medicine', 'Doctor visits, prescriptions, health'],
            ['Education', 'Tuition, books, courses, workshops'],
            ['Entertainment', 'Movies, games, subscriptions, hobbies'],
            ['Income ★', 'Salary, freelance, side income — ADDS to balance'],
            ['Others', "Anything that doesn't fit the categories above"],
          ],
        },
        {
          type: 'success',
          text: 'The **Income** category is special — it increases your remaining balance instead of decreasing it.',
        },
      ],
    },
  ],
};

const bn: HelpContent = {
  title: 'সহায়তা কেন্দ্র',
  description: 'Expensify ব্যবহারের পূর্ণ নির্দেশিকা — অ্যাকাউন্ট খোলা থেকে উন্নত ফিচার পর্যন্ত।',
  manualTitle: 'পূর্ণ ব্যবহার নির্দেশিকা (Markdown)',
  manualHint: 'অফলাইনে পড়ার জন্য পুরো নির্দেশিকা ডাউনলোড করুন।',
  manualButton: 'নির্দেশিকা ডাউনলোড',
  sectionsHint: (n) => `${n.toLocaleString('bn-BD')}টি অংশ — যেকোনো শিরোনামে ক্লিক করে খুলুন`,
  expandAll: 'সব খুলুন',
  collapseAll: 'সব বন্ধ করুন',
  footer: 'Expensify v1.0 · সহায়তার জন্য আপনার সিস্টেম অ্যাডমিনিস্ট্রেটরের সঙ্গে যোগাযোগ করুন',
  screenshotHint: 'স্ক্রিনশট রাখুন /public/screenshots/ ফোল্ডারে',
  question: 'প্রশ্ন:',
  sections: [
    {
      id: 'getting-started',
      title: 'শুরু করা',
      blocks: [
        { type: 'h4', text: 'ধাপ ১ — অ্যাকাউন্ট খুলুন', icon: 'mail', tone: 'text-accent-fg' },
        {
          type: 'steps',
          items: [
            'অ্যাপে যান। আপনাকে **লগইন** পেজে নিয়ে যাওয়া হবে।',
            'নিচের **"অ্যাকাউন্ট নেই? নতুন অ্যাকাউন্ট খুলুন"**-এ ক্লিক করুন।',
            'আপনার **পুরো নাম**, **ইমেইল ঠিকানা** এবং **পাসওয়ার্ড** (কমপক্ষে ৬ অক্ষর) লিখুন।',
            '**"অ্যাকাউন্ট খুলুন"**-এ ক্লিক করুন। সঙ্গে সঙ্গে একটি ভেরিফিকেশন ইমেইল পাঠানো হবে।',
          ],
        },
        { type: 'shot', label: 'স্ক্রিনশট: নিবন্ধন ফর্ম' },
        { type: 'h4', text: 'ধাপ ২ — ইমেইল ভেরিফাই করুন', icon: 'mail', tone: 'text-blue-400' },
        {
          type: 'steps',
          items: [
            'আপনার ইমেইলের ইনবক্সে Expensify-এর বার্তা খুঁজুন।',
            'ইমেইলে একটি **৬ সংখ্যার ভেরিফিকেশন কোড** থাকবে।',
            'ভেরিফিকেশন পেজে ৬টি সংখ্যা লিখে **"ইমেইল ভেরিফাই করুন"**-এ ক্লিক করুন।',
          ],
        },
        {
          type: 'warning',
          text: 'কোডের মেয়াদ **২ মিনিট**। মেয়াদ শেষ হলে "আবার কোড পাঠান"-এ ক্লিক করুন। প্রতিবার আবার পাঠানোর মাঝে ১২০ সেকেন্ড অপেক্ষা করতে হবে।',
        },
        { type: 'shot', label: 'স্ক্রিনশট: ইমেইল ভেরিফিকেশন পেজ' },
        { type: 'h4', text: 'ধাপ ৩ — অ্যাডমিনের অনুমোদনের অপেক্ষা', icon: 'shield', tone: 'text-amber-400' },
        {
          type: 'p',
          text: 'ইমেইল ভেরিফাই করার পর আপনার অ্যাকাউন্টের অবস্থা হয় **অপেক্ষমাণ**। লগইন করার আগে একজন অ্যাডমিনকে এটি অনুমোদন করতে হবে। কিছুক্ষণ পরে আবার লগইন করে দেখুন।',
        },
        { type: 'h4', text: 'ধাপ ৪ — লগইন করুন', icon: 'login', tone: 'text-emerald-400' },
        {
          type: 'steps',
          items: [
            '**লগইন** পেজে যান।',
            'আপনার **ইমেইল** ও **পাসওয়ার্ড** লিখুন।',
            '**"সাইন ইন"**-এ ক্লিক করুন। আপনি ড্যাশবোর্ডে পৌঁছে যাবেন।',
          ],
        },
        {
          type: 'table',
          headers: ['ত্রুটির বার্তা', 'কারণ'],
          rows: [
            ['অ্যাকাউন্ট ভেরিফাই হয়নি', 'ইমেইল OTP ধাপ শেষ করা হয়নি'],
            ['অ্যাকাউন্ট অনুমোদনের অপেক্ষায়', 'অ্যাডমিন এখনো অনুমোদন দেননি'],
            ['অ্যাকাউন্ট স্থগিত', 'অ্যাডমিন আপনার অ্যাকাউন্ট স্থগিত করেছেন'],
            ['অ্যাকাউন্ট প্রত্যাখ্যাত', 'অ্যাডমিন আপনার নিবন্ধন প্রত্যাখ্যান করেছেন'],
            ['ইমেইল বা পাসওয়ার্ড সঠিক নয়', 'ভুল ইমেইল বা পাসওয়ার্ড'],
          ],
        },
        { type: 'shot', label: 'স্ক্রিনশট: লগইন পেজ' },
      ],
    },
    {
      id: 'budget-setup',
      title: 'বাজেট ঠিক করা',
      blocks: [
        {
          type: 'p',
          text: 'খরচের হিসাব শুরুর আগে আপনার **শুরুর ব্যালেন্স** (মোট বাজেট) ঠিক করুন। এখান থেকেই আপনার বাকি ব্যালেন্স কমতে থাকবে।',
        },
        {
          type: 'steps',
          items: [
            '**ড্যাশবোর্ডে** ব্যালেন্স সেট করার বোতামে ক্লিক করুন।',
            'আপনার **মোট ব্যালেন্সের** পরিমাণ লিখুন (যেমন: `5000`)।',
            'টাকার উৎস বোঝাতে একটি **নোট** লিখুন (যেমন: _মাসিক বেতন_)।',
            '**"পরিবর্তন সংরক্ষণ"**-এ ক্লিক করুন। ড্যাশবোর্ডে মোট ও বাকি ব্যালেন্স দেখা যাবে।',
          ],
        },
        {
          type: 'info',
          text: 'যেকোনো সময় ব্যালেন্স আপডেট করতে পারবেন। আপনার লেনদেন থেকে বাকি ব্যালেন্স নিজে থেকেই আবার হিসাব হয়।',
        },
        { type: 'shot', label: 'স্ক্রিনশট: ব্যালেন্স সেট করার উইন্ডো' },
      ],
    },
    {
      id: 'dashboard',
      title: 'ড্যাশবোর্ড পরিচিতি',
      blocks: [
        { type: 'p', text: '**ড্যাশবোর্ড** আপনার মূল পাতা — এক নজরে পুরো আর্থিক অবস্থা।' },
        { type: 'shot', label: 'স্ক্রিনশট: ড্যাশবোর্ড' },
        {
          type: 'table',
          headers: ['অংশ', 'বিবরণ'],
          rows: [
            ['বর্তমান ব্যালেন্স', 'সব লেনদেনের পরে যা বাকি আছে'],
            ['মোট খরচ', 'অ্যাকাউন্ট খোলার পর থেকে সব খরচ'],
            ['এই মাসের খরচ', 'চলতি মাসের খরচের যোগফল'],
            ['আজ', 'আজ লেখা সব খরচ'],
            ['আর্থিক পর্যবেক্ষণ', 'এই মাস বনাম গত মাস'],
            ['ধার ও দেনা', 'আপনার পাওনা ও আপনার দেনা'],
            ['সাম্প্রতিক লেনদেন', 'সম্পাদনা/মোছার বোতামসহ শেষ ৫টি লেনদেন'],
            ['মাসের সারাংশ', 'এই মাসে টাকা এসেছে বনাম টাকা গেছে'],
          ],
        },
        {
          type: 'success',
          text: 'ড্যাশবোর্ড থেকেই "নতুন লেনদেন" বোতাম দিয়ে সরাসরি **নতুন লেনদেন যোগ** করতে পারবেন।',
        },
      ],
    },
    {
      id: 'expenses',
      title: 'খরচ পরিচালনা',
      blocks: [
        { type: 'shot', label: 'স্ক্রিনশট: খরচ পেজ' },
        { type: 'h4', text: 'খরচ যোগ করা', icon: 'plus', tone: 'text-emerald-400' },
        {
          type: 'steps',
          items: [
            '**"নতুন লেনদেন"**-এ ক্লিক করুন (খরচ পেজ বা ড্যাশবোর্ড থেকে)।',
            'ফর্মে **শিরোনাম**, **পরিমাণ**, **ক্যাটাগরি**, **তারিখ** এবং ঐচ্ছিক **নোট** লিখুন। চাইলে **খরচের ভাগ** দিয়ে একটি খরচকে কয়েকটি কারণে ভাগ করতে পারবেন।',
            '**"খরচ লিখুন"**-এ ক্লিক করুন। সঙ্গে সঙ্গে বাকি ব্যালেন্স আপডেট হবে।',
          ],
        },
        {
          type: 'warning',
          text: 'বাকি ব্যালেন্স খরচের পরিমাণের চেয়ে কম হলে সিস্টেম লেনদেনটি আটকে দিয়ে ত্রুটি দেখাবে।',
        },
        { type: 'shot', label: 'স্ক্রিনশট: খরচ যোগের উইন্ডো' },
        { type: 'h4', text: 'খরচ সম্পাদনা', icon: 'edit', tone: 'text-blue-400' },
        {
          type: 'steps',
          items: [
            'যেকোনো খরচের সারিতে **পেন্সিল আইকনে** ক্লিক করুন।',
            'আগের তথ্যসহ উইন্ডো খুলবে। যা বদলাতে চান বদলান।',
            '**"পরিবর্তন সংরক্ষণ"**-এ ক্লিক করুন। পার্থক্য অনুযায়ী ব্যালেন্স আবার হিসাব হবে।',
          ],
        },
        { type: 'h4', text: 'খরচ মোছা', icon: 'trash', tone: 'text-rose-400' },
        {
          type: 'steps',
          items: [
            'খরচের সারিতে **ময়লার ঝুড়ির আইকনে** ক্লিক করুন।',
            'একটি **নিশ্চিতকরণ বার্তা** আসবে। নিশ্চিত করার আগে পড়ে নিন।',
            '**"মুছুন"**-এ ক্লিক করুন। টাকা আপনার ব্যালেন্সে ফেরত যোগ হবে।',
          ],
        },
        { type: 'warning', text: 'মুছে ফেলা **স্থায়ী** — আর ফেরানো যায় না।' },
        { type: 'h4', text: 'ফিল্টার ও খোঁজা', icon: 'filter', tone: 'text-accent-fg' },
        {
          type: 'table',
          headers: ['ফিল্টার', 'কীভাবে ব্যবহার করবেন'],
          rows: [
            ['খোঁজা', 'খরচের শিরোনামের যেকোনো শব্দ লিখুন'],
            ['ক্যাটাগরি', 'তালিকা থেকে একটি ক্যাটাগরি বেছে নিন'],
            ['সময়সীমা', 'আজ / গতকাল / গত ৭ দিন / এই মাস / নিজের মতো সময়'],
            ['সাজান', 'নতুনগুলো আগে বা বেশি টাকার আগে'],
          ],
        },
        { type: 'h4', text: 'CSV এক্সপোর্ট', icon: 'download', tone: 'text-teal-400' },
        {
          type: 'steps',
          items: [
            'যে তথ্য চান তা বাছতে প্রয়োজনমতো ফিল্টার দিন।',
            '**"এক্সপোর্ট"** বোতামে ক্লিক করুন — শুধু দেখানো পেজ নয়, _মিলে যাওয়া সব রেকর্ড_ এক্সপোর্ট হবে।',
            'একটি `.csv` ফাইল ডাউনলোড হবে। Excel বা Google Sheets-এ খুলুন।',
          ],
        },
      ],
    },
    {
      id: 'income',
      title: 'আয় লেখা',
      blocks: [
        { type: 'p', text: 'আয় একটি বিশেষ লেনদেন যা ব্যালেন্স থেকে কাটার বদলে **ব্যালেন্সে যোগ হয়**।' },
        {
          type: 'steps',
          items: [
            '**"নতুন লেনদেন"**-এ ক্লিক করুন।',
            'ফর্মের উপরে **"আয়"** ট্যাব বেছে নিন।',
            'উৎস (যেমন: _ফ্রিল্যান্স পেমেন্ট_), পরিমাণ ও তারিখ লিখুন।',
            'সংরক্ষণ করুন — আপনার বাকি ব্যালেন্স সেই পরিমাণ **বাড়বে**।',
          ],
        },
        { type: 'info', text: 'আয় বিশ্লেষণ পেজে এবং ড্যাশবোর্ডের মাসিক "টাকা এসেছে" হিসাবে দেখা যায়।' },
      ],
    },
    {
      id: 'transaction-history',
      title: 'লেনদেনের ইতিহাস',
      blocks: [
        {
          type: 'p',
          text: '**লেনদেনের ইতিহাস** পেজে ধার ও দেনাসহ সব লেনদেনের তারিখ অনুযায়ী পূর্ণ খাতা দেখা যায়, সঙ্গে চলমান ব্যালেন্সের কলাম।',
        },
        { type: 'shot', label: 'স্ক্রিনশট: লেনদেনের ইতিহাস' },
        {
          type: 'table',
          headers: ['কলাম', 'বিবরণ'],
          rows: [
            ['তারিখ', 'লেনদেনটি কবে হয়েছে'],
            ['লেনদেন', 'লেনদেনের নাম/বিবরণ'],
            ['ক্যাটাগরি', 'লেনদেনের ক্যাটাগরি'],
            ['ধরনের ব্যাজ', 'সবুজ = জমা, লাল = খরচ'],
            ['পরিমাণ', 'লেনদেনের টাকা'],
            ['ব্যালেন্স', 'এই লেনদেনের পরে আপনার ব্যালেন্স'],
          ],
        },
        { type: 'info', text: 'এই পাতায় শুধু **দেখা যায়**। সম্পাদনা বা মোছার জন্য খরচ পেজে যান।' },
      ],
    },
    {
      id: 'analytics',
      title: 'বিশ্লেষণ ও চার্ট',
      blocks: [
        {
          type: 'p',
          text: '**বিশ্লেষণ** পেজে আপনার বেছে নেওয়া যেকোনো সময়ের জন্য ইন্টারঅ্যাকটিভ চার্টে খরচের ধরন দেখা যায়।',
        },
        { type: 'shot', label: 'স্ক্রিনশট: বিশ্লেষণের চার্ট' },
        {
          type: 'table',
          headers: ['চার্ট / অংশ', 'কী দেখায়'],
          rows: [
            ['সারসংক্ষেপ', 'ব্যালেন্স, আয়, খরচ, নিট প্রবাহ, ধার ও দেনা'],
            ['আয় বনাম খরচ', 'এই সময় বনাম আগের সময়'],
            ['প্রবণতা', 'দৈনিক, সাপ্তাহিক বা মাসিক খরচ, আয় বা নিট প্রবাহ'],
            ['সবচেয়ে বেশি খরচের খাত', 'মোট খরচে প্রতিটি খাতের অংশ'],
            ['খাতভিত্তিক তুলনা', 'প্রতিটি খাত, এই সময় বনাম আগের সময়'],
            ['খরচের পরিসংখ্যান', 'গড়, সবচেয়ে বেশি ও কম খরচের দিন, সবচেয়ে বড় খরচ'],
          ],
        },
      ],
    },
    {
      id: 'profile',
      title: 'প্রোফাইল ও পাসওয়ার্ড',
      blocks: [
        { type: 'p', text: '**প্রোফাইল** পেজে আপনার অ্যাকাউন্টের তথ্য দেখা যায় এবং পাসওয়ার্ড বদলানো যায়।' },
        { type: 'shot', label: 'স্ক্রিনশট: প্রোফাইল পেজ' },
        {
          type: 'table',
          headers: ['ঘর', 'বিবরণ'],
          rows: [
            ['পুরো নাম ও ইমেইল', 'আপনার নিবন্ধিত পরিচয়'],
            ['ভূমিকা', 'ব্যবহারকারী বা অ্যাডমিন'],
            ['অ্যাকাউন্টের অবস্থা', 'অনুমোদিত / অপেক্ষমাণ / স্থগিত / প্রত্যাখ্যাত'],
            ['সদস্য হয়েছেন', 'নিবন্ধনের তারিখ'],
            ['অনুমোদন দিয়েছেন', 'অ্যাডমিনের নাম ও অনুমোদনের সময়'],
          ],
        },
        { type: 'sub', text: 'পাসওয়ার্ড বদলানো' },
        {
          type: 'steps',
          items: [
            'প্রোফাইল পেজে **"পাসওয়ার্ড পরিবর্তন"**-এ ক্লিক করুন।',
            '**বর্তমান পাসওয়ার্ড**, তারপর **নতুন পাসওয়ার্ড** (কমপক্ষে ৬ অক্ষর), তারপর **নতুন পাসওয়ার্ড নিশ্চিত করুন** লিখুন।',
            '**"পাসওয়ার্ড আপডেট করুন"**-এ ক্লিক করুন। পরের বার নতুন পাসওয়ার্ড দিয়ে লগইন করুন।',
          ],
        },
        { type: 'sub', text: 'পাসওয়ার্ড ভুলে গেছেন?' },
        {
          type: 'steps',
          items: [
            '**লগইন** পেজে **"পাসওয়ার্ড ভুলে গেছেন?"**-এ ক্লিক করুন।',
            'আপনার ইমেইল দিন — সেখানে একটি **৬ সংখ্যার রিসেট কোড** যাবে (১০ মিনিট চলবে)।',
            'কোড ও নতুন পাসওয়ার্ড দিয়ে **"পাসওয়ার্ড রিসেট করুন"**-এ ক্লিক করুন।',
          ],
        },
      ],
    },
    {
      id: 'settings',
      title: 'সেটিংস',
      blocks: [
        { type: 'shot', label: 'স্ক্রিনশট: সেটিংস পেজ' },
        {
          type: 'table',
          headers: ['সেটিং', 'বিবরণ'],
          rows: [
            ['থিম', 'লাইট বা ডার্ক চেহারা, এই ডিভাইসে সংরক্ষিত'],
            ['ভাষা', 'English বা বাংলা — লেখা, সংখ্যা ও তারিখ, এই ডিভাইসে সংরক্ষিত'],
            ['অ্যাপের ভেতরে বার্তা', 'সফল/ব্যর্থ হওয়ার পপআপ বার্তা চালু/বন্ধ'],
            ['সাপ্তাহিক সারাংশ', 'সারাংশ ইমেইল চালু/বন্ধ'],
            ['খাতা রিসেট', 'সব খরচ মুছে ব্যালেন্স শূন্য করে'],
            ['সাইন আউট', 'অ্যাপ থেকে লগআউট করে'],
          ],
        },
        { type: 'warning', text: '**খাতা রিসেট** আর ফেরানো যায় না। সব খরচের রেকর্ড ও ব্যালেন্স স্থায়ীভাবে মুছে যাবে।' },
      ],
    },
    {
      id: 'admin',
      title: 'অ্যাডমিন নির্দেশিকা',
      blocks: [
        {
          type: 'info',
          text: 'অ্যাডমিন ফিচার শুধু **অ্যাডমিন** ভূমিকার ব্যবহারকারীরা দেখতে পান। সাইডবারে "অ্যাডমিন" অংশটি দেখুন।',
        },
        { type: 'h4', text: 'অ্যাডমিন সারসংক্ষেপ', icon: 'shield', tone: 'text-rose-400' },
        { type: 'shot', label: 'স্ক্রিনশট: অ্যাডমিন ড্যাশবোর্ড' },
        {
          type: 'table',
          headers: ['মাপকাঠি', 'বিবরণ'],
          rows: [
            ['মোট ব্যবহারকারী', 'সিস্টেমের সব নিবন্ধিত ব্যবহারকারী'],
            ['লেখা মোট খরচ', 'সব ব্যবহারকারীর খরচের যোগফল'],
            ['অনুমোদনের অপেক্ষায়', 'যাদের অ্যাকাউন্ট অনুমোদনের অপেক্ষায়'],
            ['অবস্থা অনুযায়ী অ্যাকাউন্ট', 'অনুমোদিত, অপেক্ষমাণ, স্থগিত ও প্রত্যাখ্যাতের সংখ্যা'],
          ],
        },
        { type: 'h4', text: 'ব্যবহারকারী পরিচালনা', icon: 'users', tone: 'text-rose-400' },
        { type: 'shot', label: 'স্ক্রিনশট: ব্যবহারকারীর তালিকা' },
        { type: 'sub', text: 'নতুন ব্যবহারকারী অনুমোদন' },
        {
          type: 'steps',
          items: [
            '**অপেক্ষমাণ** অবস্থার ব্যবহারকারীকে খুঁজুন।',
            '**"অনুমোদন"**-এ ক্লিক করে নিশ্চিত করুন।',
            'অবস্থা **অনুমোদিত** হবে — এখন তিনি লগইন করতে পারবেন।',
          ],
        },
        { type: 'sub', text: 'চালু থাকা ব্যবহারকারী স্থগিত করা' },
        {
          type: 'steps',
          items: [
            '**অনুমোদিত** ব্যবহারকারীকে খুঁজুন।',
            '**স্থগিত** বোতামে ক্লিক করে নিশ্চিত করুন। ব্যবহারকারী সঙ্গে সঙ্গে আটকে যাবেন — চলমান সেশনেও।',
          ],
        },
        { type: 'sub', text: 'ব্যবহারকারীর ভূমিকা বদলানো' },
        {
          type: 'steps',
          items: ['একজন **অনুমোদিত** ব্যবহারকারীকে খুঁজুন।', 'ভূমিকার তালিকা থেকে **অ্যাডমিন** বা **ব্যবহারকারী** বেছে নিশ্চিত করুন।'],
        },
        { type: 'warning', text: 'আপনি **নিজের অ্যাডমিন অধিকার সরাতে পারবেন না**। এতে ভুল করে আটকে যাওয়া এড়ানো যায়।' },
      ],
    },
    {
      id: 'faq',
      title: 'সাধারণ প্রশ্ন ও সমস্যার সমাধান',
      blocks: [
        {
          type: 'faq',
          items: [
            {
              q: 'নিবন্ধন করেছি কিন্তু লগইন করতে পারছি না।',
              a: 'আপনার অ্যাকাউন্টের ইমেইল ভেরিফিকেশন এবং অ্যাডমিনের অনুমোদন দুটোই লাগবে। ৬ সংখ্যার OTP ধাপ শেষ করেছেন কিনা দেখুন, তারপর অ্যাডমিনের অনুমোদনের অপেক্ষা করুন।',
            },
            {
              q: 'আমার ভেরিফিকেশন কোডের মেয়াদ শেষ।',
              a: "কোডের মেয়াদ ২ মিনিট। ভেরিফিকেশন পেজে 'আবার কোড পাঠান'-এ ক্লিক করুন। প্রতিবার আবার পাঠানোর মাঝে কমপক্ষে ১২০ সেকেন্ড অপেক্ষা করতে হবে।",
            },
            {
              q: 'খরচ যোগ করতে পারছি না — ব্যালেন্সের ত্রুটি।',
              a: 'আপনার বাকি ব্যালেন্স খরচের পরিমাণের চেয়ে কম। পরিমাণ কমান, পুরনো খরচ মুছে ব্যালেন্স খালি করুন, অথবা শুরুর ব্যালেন্স আপডেট করুন।',
            },
            {
              q: 'ভুল করে একটি খরচ মুছে ফেলেছি।',
              a: 'মুছে ফেলা স্থায়ী, আর ফেরানো যায় না। মোছার আগে সবসময় ভালো করে নিশ্চিত হয়ে নিন।',
            },
            {
              q: 'ড্যাশবোর্ডে বাকি ব্যালেন্স ৳০ দেখাচ্ছে।',
              a: 'আপনি এখনো ব্যালেন্স সেট করেননি। শুরুর ব্যালেন্স সেট করে আপনার বাজেটের পরিমাণ লিখুন।',
            },
            {
              q: 'পাসওয়ার্ড ভুলে গেছি।',
              a: "লগইন পেজে 'পাসওয়ার্ড ভুলে গেছেন?'-এ ক্লিক করুন, ইমেইল দিন, আর আমাদের পাঠানো ৬ সংখ্যার কোড দিয়ে নতুন পাসওয়ার্ড সেট করুন।",
            },
            {
              q: 'Expensify কি মোবাইলে চলে?',
              a: 'হ্যাঁ — সম্পূর্ণ রেসপন্সিভ। মোবাইলে সাইডবারটি উপরের নেভিগেশন বারে একটি মেনু বোতাম হয়ে যায়।',
            },
            {
              q: 'ভাষা বাংলায় কীভাবে বদলাব?',
              a: "সেটিংস → ভাষা খুলে 'বাংলা' বেছে নিন। লেখা, সংখ্যা ও তারিখ সঙ্গে সঙ্গে বদলে যাবে।",
            },
            {
              q: 'অ্যাডমিন হিসেবে নিজের অধিকার কেন সরাতে পারি না?',
              a: 'ভুল করে আটকে যাওয়া ঠেকাতে এটি একটি নিরাপত্তা ব্যবস্থা। দরকার হলে অন্য একজন অ্যাডমিন আপনার ভূমিকা বদলাতে পারবেন।',
            },
          ],
        },
      ],
    },
    {
      id: 'categories',
      title: 'খরচের ক্যাটাগরির তালিকা',
      blocks: [
        {
          type: 'table',
          headers: ['ক্যাটাগরি', 'কীসের জন্য'],
          rows: [
            ['খাবার', 'খাবার, বাজার, নাস্তা, রেস্টুরেন্ট'],
            ['যাতায়াত', 'জ্বালানি, বাস ভাড়া, রাইড শেয়ার, পার্কিং'],
            ['কেনাকাটা', 'কাপড়, ইলেকট্রনিক্স, ঘরের জিনিস'],
            ['বিল', 'বিদ্যুৎ, পানি, ইন্টারনেট, বাসা ভাড়া'],
            ['ওষুধ', 'ডাক্তার দেখানো, প্রেসক্রিপশন, স্বাস্থ্য'],
            ['শিক্ষা', 'টিউশন, বই, কোর্স, কর্মশালা'],
            ['বিনোদন', 'সিনেমা, গেম, সাবস্ক্রিপশন, শখ'],
            ['আয় ★', 'বেতন, ফ্রিল্যান্স, অতিরিক্ত আয় — ব্যালেন্সে যোগ হয়'],
            ['অন্যান্য', 'উপরের কোনো ক্যাটাগরিতে পড়ে না এমন সব'],
          ],
        },
        { type: 'success', text: '**আয়** ক্যাটাগরি বিশেষ — এটি বাকি ব্যালেন্স কমানোর বদলে বাড়ায়।' },
      ],
    },
  ],
};

const content: Record<Locale, HelpContent> = { en, bn };

export function getHelpContent(locale: Locale) {
  return content[locale];
}
