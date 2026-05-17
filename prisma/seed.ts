import { PrismaClient, Role, UserStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Clear existing database entries in cascade order
  await prisma.expense.deleteMany();
  await prisma.balance.deleteMany();
  await prisma.user.deleteMany();
  console.log("🧹 Cleared existing database tables.");

  // 2. Hash default passwords
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "";
  const userEmail = process.env.SEED_USER_EMAIL || "";
  const userPassword = process.env.SEED_USER_PASSWORD || "";

  const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);
  const userPasswordHash = bcrypt.hashSync(userPassword, 10);

  // 3. Seed Default Admin User
  const admin = await prisma.user.create({
    data: {
      name: "System Admin",
      email: adminEmail,
      password: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy: "System Auto-Seed",
      emailVerified: true,
    },
  });
  console.log(
    `🛡️ Created Default Admin User: ${adminEmail} / ${adminPassword}`,
  );

  // 4. Seed Default Approved User
  const user = await prisma.user.create({
    data: {
      name: "John Doe",
      email: userEmail,
      password: userPasswordHash,
      role: Role.USER,
      status: UserStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy: "System Auto-Seed",
      emailVerified: true,
    },
  });
  console.log(
    `👤 Created Default Approved User: ${userEmail} / ${userPassword}`,
  );

  // 5. Seed a Pending User (for demonstration in Admin Panel)
  const pendingUserEmail = "alice@expense.com";
  const pendingUserPassword = "alice123";
  const pendingUser = await prisma.user.create({
    data: {
      name: "Alice Smith",
      email: pendingUserEmail,
      password: bcrypt.hashSync(pendingUserPassword, 10),
      role: Role.USER,
      status: UserStatus.PENDING,
    },
  });
  console.log(
    `⏳ Created Pending User: ${pendingUserEmail} / ${pendingUserPassword}`,
  );

  // 6. Seed a Suspended User (for demonstration in Admin Panel)
  const suspendedUserEmail = "bob@expense.com";
  const suspendedUserPassword = "bob123";
  const suspendedUser = await prisma.user.create({
    data: {
      name: "Bob Johnson",
      email: suspendedUserEmail,
      password: bcrypt.hashSync(suspendedUserPassword, 10),
      role: Role.USER,
      status: UserStatus.SUSPENDED,
    },
  });
  console.log(
    `🚫 Created Suspended User: ${suspendedUserEmail} / ${suspendedUserPassword}`,
  );

  // 7. Seed Initial Balances for Admin and User
  await prisma.balance.create({
    data: {
      totalBalance: 10000.0,
      remainingBalance: 7850.0, // After $2,150 in mock expenses
      userId: user.id,
    },
  });

  await prisma.balance.create({
    data: {
      totalBalance: 25000.0,
      remainingBalance: 25000.0,
      userId: admin.id,
    },
  });
  console.log("💰 Created Initial Balances.");

  // 8. Seed Mock Expenses for default user
  const now = new Date();
  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(now.getDate() - daysAgo);
    return d;
  };

  const mockExpenses = [
    {
      title: "Weekly Groceries Shopping",
      amount: 150.0,
      category: "Food",
      note: "Bought organic items from Whole Foods",
      expenseDate: now, // Today
    },
    {
      title: "Monthly Electric Bill",
      amount: 320.0,
      category: "Bills",
      note: "AC cooling season electricity charge",
      expenseDate: getPastDate(1), // Yesterday
    },
    {
      title: "Uber to Office",
      amount: 25.0,
      category: "Transport",
      note: "Rainy day high ride pricing",
      expenseDate: getPastDate(2), // 2 Days Ago
    },
    {
      title: "Tech Gadget Purchase",
      amount: 1200.0,
      category: "Shopping",
      note: "Mechanical keyboard and gaming mouse",
      expenseDate: getPastDate(3), // 3 Days Ago
    },
    {
      title: "Medical Checkup & Pharmacy",
      amount: 85.0,
      category: "Medicine",
      note: "Pain killers and vitamin supplements",
      expenseDate: getPastDate(5), // 5 Days Ago
    },
    {
      title: "Advanced React Course",
      amount: 199.0,
      category: "Education",
      note: "Learn Server Actions and state machines",
      expenseDate: getPastDate(8), // 8 Days Ago
    },
    {
      title: "Cinema & Popcorn Night",
      amount: 45.0,
      category: "Entertainment",
      note: "Sci-fi thriller movie with friends",
      expenseDate: getPastDate(12), // 12 Days Ago
    },
    {
      title: "High-speed Internet Subscription",
      amount: 75.0,
      category: "Bills",
      note: "Fiber optic 500Mbps connection",
      expenseDate: getPastDate(15), // 15 Days Ago
    },
    {
      title: "Coffee Beans & Roasting Kit",
      amount: 51.0,
      category: "Food",
      note: "Single origin Ethiopian Arabica",
      expenseDate: getPastDate(20), // 20 Days Ago
    },
  ];

  for (const exp of mockExpenses) {
    await prisma.expense.create({
      data: {
        ...exp,
        userId: user.id,
      },
    });
  }
  console.log(`📊 Loaded ${mockExpenses.length} Mock Expenses for John Doe.`);

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
