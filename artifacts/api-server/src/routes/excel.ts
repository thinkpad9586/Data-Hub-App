import { Router, type IRouter } from "express";
import { and, eq, gte, lte } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db, membersTable, attendanceTable } from "@workspace/db";
import {
  ExportAttendanceExcelQueryParams,
  ImportMembersExcelBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/excel/export", async (req, res): Promise<void> => {
  const parsed = ExportAttendanceExcelQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { startDate, endDate } = parsed.data;

  const conditions = [];
  if (startDate) conditions.push(gte(attendanceTable.date, startDate));
  if (endDate) conditions.push(lte(attendanceTable.date, endDate));

  const records = await db
    .select({
      memberId: membersTable.memberId,
      name: membersTable.name,
      role: membersTable.role,
      department: membersTable.department,
      year: membersTable.year,
      section: membersTable.section,
      date: attendanceTable.date,
      status: attendanceTable.status,
      note: attendanceTable.note,
    })
    .from(attendanceTable)
    .innerJoin(membersTable, eq(attendanceTable.memberId, membersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(attendanceTable.date, membersTable.name);

  const rows = records.map((r) => ({
    "Member ID": r.memberId,
    "Name": r.name,
    "Role": r.role,
    "Department": r.department,
    "Year": r.year ?? "",
    "Section": r.section ?? "",
    "Date": r.date,
    "Status": r.status,
    "Note": r.note ?? "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws["!cols"] = [
    { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 20 },
    { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Attendance");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fileBase64 = buffer.toString("base64");
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `attendance_${dateStr}.xlsx`;

  res.json({ fileBase64, filename });
});

router.post("/excel/import", async (req, res): Promise<void> => {
  const parsed = ImportMembersExcelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const buffer = Buffer.from(parsed.data.fileBase64, "base64");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const wsName = wb.SheetNames[0];
  if (!wsName) {
    res.status(400).json({ error: "Empty workbook" });
    return;
  }

  const ws = wb.Sheets[wsName];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const insertedMembers = [];

  for (const row of rows) {
    const memberId = String(row["Member ID"] ?? row["memberId"] ?? row["MemberID"] ?? "").trim();
    const name = String(row["Name"] ?? row["name"] ?? "").trim();
    const role = String(row["Role"] ?? row["role"] ?? "student").trim().toLowerCase();
    const department = String(row["Department"] ?? row["department"] ?? "Computer Science").trim();
    const email = String(row["Email"] ?? row["email"] ?? "").trim() || undefined;
    const phone = String(row["Phone"] ?? row["phone"] ?? "").trim() || undefined;
    const year = String(row["Year"] ?? row["year"] ?? "").trim() || undefined;
    const section = String(row["Section"] ?? row["section"] ?? "").trim() || undefined;

    if (!memberId || !name) {
      errors.push(`Skipped row — missing Member ID or Name`);
      skipped++;
      continue;
    }

    const validRole = ["student", "staff", "faculty"].includes(role) ? role : "student";

    try {
      const existing = await db
        .select({ id: membersTable.id })
        .from(membersTable)
        .where(eq(membersTable.memberId, memberId));

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const [member] = await db
        .insert(membersTable)
        .values({ memberId, name, role: validRole, department, email, phone, year, section })
        .returning();

      insertedMembers.push(member);
      imported++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error for ${memberId}: ${msg}`);
      skipped++;
    }
  }

  res.json({ imported, skipped, errors, members: insertedMembers });
});

export default router;
