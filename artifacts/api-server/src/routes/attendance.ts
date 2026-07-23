import { Router, type IRouter } from "express";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db, attendanceTable, membersTable } from "@workspace/db";
import {
  ListAttendanceQueryParams,
  MarkAttendanceBody,
  BulkMarkAttendanceBody,
  UpdateAttendanceParams,
  UpdateAttendanceBody,
  DeleteAttendanceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Helper to fetch attendance with member info
async function getAttendanceWithMember(id: number) {
  const result = await db
    .select({
      id: attendanceTable.id,
      memberId: attendanceTable.memberId,
      memberName: membersTable.name,
      memberMemberId: membersTable.memberId,
      date: attendanceTable.date,
      status: attendanceTable.status,
      note: attendanceTable.note,
      createdAt: attendanceTable.createdAt,
    })
    .from(attendanceTable)
    .innerJoin(membersTable, eq(attendanceTable.memberId, membersTable.id))
    .where(eq(attendanceTable.id, id));
  return result[0];
}

router.get("/attendance", async (req, res): Promise<void> => {
  const parsed = ListAttendanceQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, memberId, startDate, endDate } = parsed.data;

  const conditions = [];
  if (date) conditions.push(eq(attendanceTable.date, date));
  if (memberId) conditions.push(eq(attendanceTable.memberId, Number(memberId)));
  if (startDate) conditions.push(gte(attendanceTable.date, startDate));
  if (endDate) conditions.push(lte(attendanceTable.date, endDate));

  const query = db
    .select({
      id: attendanceTable.id,
      memberId: attendanceTable.memberId,
      memberName: membersTable.name,
      memberMemberId: membersTable.memberId,
      date: attendanceTable.date,
      status: attendanceTable.status,
      note: attendanceTable.note,
      createdAt: attendanceTable.createdAt,
    })
    .from(attendanceTable)
    .innerJoin(membersTable, eq(attendanceTable.memberId, membersTable.id));

  const records = conditions.length > 0
    ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(attendanceTable.date, membersTable.name)
    : await query.orderBy(attendanceTable.date, membersTable.name);

  res.json(records);
});

router.post("/attendance", async (req, res): Promise<void> => {
  const parsed = MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { memberId, date, status, note } = parsed.data;

  // Upsert: if record exists for this member+date, update it
  const existing = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.memberId, memberId), eq(attendanceTable.date, date)));

  let id: number;
  if (existing.length > 0) {
    const [updated] = await db
      .update(attendanceTable)
      .set({ status, note: note ?? null })
      .where(eq(attendanceTable.id, existing[0].id))
      .returning();
    id = updated.id;
  } else {
    const [inserted] = await db
      .insert(attendanceTable)
      .values({ memberId, date, status, note: note ?? null })
      .returning();
    id = inserted.id;
  }

  const record = await getAttendanceWithMember(id);
  res.status(201).json(record);
});

router.post("/attendance/bulk", async (req, res): Promise<void> => {
  const parsed = BulkMarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, records } = parsed.data;
  const ids: number[] = [];

  for (const record of records) {
    const existing = await db
      .select()
      .from(attendanceTable)
      .where(and(eq(attendanceTable.memberId, record.memberId), eq(attendanceTable.date, date)));

    if (existing.length > 0) {
      const [updated] = await db
        .update(attendanceTable)
        .set({ status: record.status, note: record.note ?? null })
        .where(eq(attendanceTable.id, existing[0].id))
        .returning();
      ids.push(updated.id);
    } else {
      const [inserted] = await db
        .insert(attendanceTable)
        .values({ memberId: record.memberId, date, status: record.status, note: record.note ?? null })
        .returning();
      ids.push(inserted.id);
    }
  }

  const result = await db
    .select({
      id: attendanceTable.id,
      memberId: attendanceTable.memberId,
      memberName: membersTable.name,
      memberMemberId: membersTable.memberId,
      date: attendanceTable.date,
      status: attendanceTable.status,
      note: attendanceTable.note,
      createdAt: attendanceTable.createdAt,
    })
    .from(attendanceTable)
    .innerJoin(membersTable, eq(attendanceTable.memberId, membersTable.id))
    .where(inArray(attendanceTable.id, ids));

  res.status(201).json(result);
});

router.patch("/attendance/:id", async (req, res): Promise<void> => {
  const params = UpdateAttendanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateAttendanceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(attendanceTable)
    .set(body.data)
    .where(eq(attendanceTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Attendance record not found" });
    return;
  }

  const record = await getAttendanceWithMember(updated.id);
  res.json(record);
});

router.delete("/attendance/:id", async (req, res): Promise<void> => {
  const params = DeleteAttendanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(attendanceTable)
    .where(eq(attendanceTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Attendance record not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
