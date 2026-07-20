import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { db, attendanceTable, membersTable } from "@workspace/db";
import {
  GetDashboardSummaryQueryParams,
  GetMemberStatsQueryParams,
  GetDailyTrendQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const date = parsed.data.date ?? new Date().toISOString().split("T")[0];

  const [totalResult] = await db.select({ count: count() }).from(membersTable);
  const totalMembers = totalResult?.count ?? 0;

  const todayRecords = await db
    .select({ status: attendanceTable.status })
    .from(attendanceTable)
    .where(eq(attendanceTable.date, date));

  const presentToday = todayRecords.filter((r) => r.status === "present").length;
  const absentToday = todayRecords.filter((r) => r.status === "absent").length;
  const lateToday = todayRecords.filter((r) => r.status === "late").length;
  const excusedToday = todayRecords.filter((r) => r.status === "excused").length;
  const attendanceRateToday = totalMembers > 0 ? Math.round(((presentToday + lateToday) / totalMembers) * 100) : 0;

  res.json({
    totalMembers,
    presentToday,
    absentToday,
    lateToday,
    excusedToday,
    attendanceRateToday,
    date,
  });
});

router.get("/dashboard/member-stats", async (req, res): Promise<void> => {
  const parsed = GetMemberStatsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { startDate, endDate } = parsed.data;

  const members = await db.select().from(membersTable).orderBy(membersTable.name);

  const stats = await Promise.all(
    members.map(async (member) => {
      const conditions = [eq(attendanceTable.memberId, member.id)];
      if (startDate) conditions.push(gte(attendanceTable.date, startDate));
      if (endDate) conditions.push(lte(attendanceTable.date, endDate));

      const records = await db
        .select({ status: attendanceTable.status })
        .from(attendanceTable)
        .where(and(...conditions));

      const totalDays = records.length;
      const presentDays = records.filter((r) => r.status === "present").length;
      const absentDays = records.filter((r) => r.status === "absent").length;
      const lateDays = records.filter((r) => r.status === "late").length;
      const excusedDays = records.filter((r) => r.status === "excused").length;
      const attendanceRate = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0;

      return {
        memberId: member.id,
        memberName: member.name,
        memberMemberId: member.memberId,
        role: member.role,
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        excusedDays,
        attendanceRate,
        photoUrl: member.photoUrl ?? null,
      };
    })
  );

  res.json(stats);
});

router.get("/dashboard/daily-trend", async (req, res): Promise<void> => {
  const parsed = GetDailyTrendQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const days = parsed.data.days ?? 30;
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - (days - 1) * 86400000).toISOString().split("T")[0];

  const records = await db
    .select({ date: attendanceTable.date, status: attendanceTable.status })
    .from(attendanceTable)
    .where(and(gte(attendanceTable.date, startDate), lte(attendanceTable.date, endDate)));

  // Group by date
  const byDate: Record<string, { present: number; absent: number; late: number; excused: number }> = {};
  for (const r of records) {
    if (!byDate[r.date]) byDate[r.date] = { present: 0, absent: 0, late: 0, excused: 0 };
    if (r.status === "present") byDate[r.date].present++;
    else if (r.status === "absent") byDate[r.date].absent++;
    else if (r.status === "late") byDate[r.date].late++;
    else if (r.status === "excused") byDate[r.date].excused++;
  }

  // Build trend for each day in range
  const trend = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split("T")[0];
    const counts = byDate[d] ?? { present: 0, absent: 0, late: 0, excused: 0 };
    trend.push({
      date: d,
      present: counts.present,
      absent: counts.absent,
      late: counts.late,
      excused: counts.excused,
      total: counts.present + counts.absent + counts.late + counts.excused,
    });
  }

  res.json(trend);
});

export default router;
