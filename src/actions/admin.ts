"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Helper to check if current user is an admin
async function getAdminUser() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || session.status !== "APPROVED") {
    throw new Error("Unauthorized. Admin privilege required.");
  }
  return session;
}

export async function getAllUsers() {
  await getAdminUser();

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        approvedAt: true,
        approvedBy: true,
        createdAt: true,
      },
    });
    return users;
  } catch (error) {
    console.error("getAllUsers error:", error);
    throw new Error("Failed to retrieve user registry.");
  }
}

export async function updateUserStatus(
  userId: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED",
) {
  const admin = await getAdminUser();

  try {
    const updateData: any = { status };

    if (status === "APPROVED") {
      updateData.approvedAt = new Date();
      updateData.approvedBy = admin.name;
    } else {
      // Clear approval details if rejected, pending or suspended
      updateData.approvedAt = null;
      updateData.approvedBy = null;
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/dashboard");

    return { success: true, user: updatedUser };
  } catch (error: any) {
    console.error("updateUserStatus error:", error);
    return {
      success: false,
      error: error.message || "Failed to update user status.",
    };
  }
}

export async function getAdminOverview() {
  await getAdminUser();

  try {
    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      suspendedCount,
      totalExpensesAgg,
      totalUsers,
    ] = await Promise.all([
      db.user.count({ where: { status: "PENDING" } }),
      db.user.count({ where: { status: "APPROVED" } }),
      db.user.count({ where: { status: "REJECTED" } }),
      db.user.count({ where: { status: "SUSPENDED" } }),
      db.expense.aggregate({ _sum: { amount: true } }),
      db.user.count(),
    ]);

    const totalSystemExpenses = totalExpensesAgg._sum.amount || 0;

    return {
      pendingCount,
      approvedCount,
      rejectedCount,
      suspendedCount,
      totalSystemExpenses,
      totalUsers,
    };
  } catch (error) {
    console.error("getAdminOverview error:", error);
    throw new Error("Failed to retrieve system overview metrics.");
  }
}

/**
 * Update a user's role between USER and ADMIN.
 * Rules:
 *  - Only the logged-in admin can call this.
 *  - Target user must be APPROVED (cannot change role of PENDING/SUSPENDED/REJECTED).
 *  - Admin cannot demote themselves (prevents system lock-out).
 */
export async function updateUserRole(
  userId: string,
  newRole: "USER" | "ADMIN",
) {
  const admin = await getAdminUser();

  // Prevent self-demotion
  if (admin.id === userId && newRole === "USER") {
    return {
      success: false,
      error: "You cannot demote your own admin account.",
    };
  }

  try {
    // Verify target user is APPROVED before touching role
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { status: true, role: true },
    });

    if (!targetUser) {
      return { success: false, error: "User not found." };
    }

    if (targetUser.status !== "APPROVED") {
      return {
        success: false,
        error: "Role can only be changed for APPROVED users.",
      };
    }

    await db.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("updateUserRole error:", error);
    return {
      success: false,
      error: error.message || "Failed to update user role.",
    };
  }
}

