import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { useGetMemberStats, useExportAttendanceExcel } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar as CalendarIcon, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Reports() {
  const [dateRange, setDateRange] = useState<{from: Date, to: Date}>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const startDateStr = format(dateRange.from, "yyyy-MM-dd");
  const endDateStr = format(dateRange.to, "yyyy-MM-dd");

  const { data: stats, isLoading } = useGetMemberStats({
    startDate: startDateStr,
    endDate: endDateStr
  });

  const exportMutation = useExportAttendanceExcel();

  const handleExport = () => {
    exportMutation.mutate(
      { params: { startDate: startDateStr, endDate: endDateStr } },
      {
        onSuccess: (result) => {
          // Trigger browser download from base64
          const link = document.createElement('a');
          link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.fileBase64}`;
          link.download = result.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    );
  };

  const getAttendanceBadgeVariant = (rate: number) => {
    if (rate >= 90) return "success";
    if (rate >= 75) return "warning";
    return "destructive";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Export attendance data and view member statistics.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left font-normal bg-card">
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  } else if (range?.from) {
                    // Set single day selection to avoid breaking stats
                    setDateRange({ from: range.from, to: range.from });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button 
            onClick={handleExport} 
            disabled={exportMutation.isPending || isLoading || !stats || stats.length === 0}
            className="gap-2 shrink-0 bg-[#1D6F42] hover:bg-[#155A34] text-white" // Excel green
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportMutation.isPending ? "Generating..." : "Export to Excel"}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border overflow-hidden">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <CardTitle className="text-lg">Attendance Statistics</CardTitle>
          <CardDescription>
            Showing cumulative statistics for {stats?.length || 0} members between {format(dateRange.from, "MMM d")} and {format(dateRange.to, "MMM d, yyyy")}.
          </CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/10 hover:bg-muted/10">
              <TableHead className="w-[280px]">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Total Days</TableHead>
              <TableHead className="text-right">Present</TableHead>
              <TableHead className="text-right">Absent</TableHead>
              <TableHead className="text-right">Late</TableHead>
              <TableHead className="text-right">Excused</TableHead>
              <TableHead className="text-right w-[120px]">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="flex gap-3 items-center"><div className="w-8 h-8 rounded-full bg-muted"></div><div className="h-4 w-32 bg-muted rounded"></div></div></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted rounded"></div></TableCell>
                  <TableCell><div className="h-4 w-8 bg-muted rounded ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 w-8 bg-muted rounded ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 w-8 bg-muted rounded ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 w-8 bg-muted rounded ml-auto"></div></TableCell>
                  <TableCell><div className="h-4 w-8 bg-muted rounded ml-auto"></div></TableCell>
                  <TableCell><div className="h-6 w-12 bg-muted rounded-full ml-auto"></div></TableCell>
                </TableRow>
              ))
            ) : !stats || stats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No attendance records found for the selected date range.
                </TableCell>
              </TableRow>
            ) : (
              stats.map((stat) => (
                <TableRow key={stat.memberId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        {stat.photoUrl ? (
                          <AvatarImage src={stat.photoUrl} alt={stat.memberName} />
                        ) : (
                          <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
                            {stat.memberName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm text-foreground">{stat.memberName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{stat.memberMemberId}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-muted-foreground capitalize">{stat.role}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{stat.totalDays}</TableCell>
                  <TableCell className="text-right text-accent font-medium">{stat.presentDays}</TableCell>
                  <TableCell className="text-right text-destructive font-medium">{stat.absentDays}</TableCell>
                  <TableCell className="text-right text-amber-600 dark:text-amber-500 font-medium">{stat.lateDays}</TableCell>
                  <TableCell className="text-right text-blue-600 dark:text-blue-500 font-medium">{stat.excusedDays}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getAttendanceBadgeVariant(stat.attendanceRate)} className="ml-auto w-14 justify-center">
                      {Math.round(stat.attendanceRate)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
