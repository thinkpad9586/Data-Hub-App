import { useGetDashboardSummary, useGetDailyTrend, useGetMemberStats } from "@workspace/api-client-react";
import { getRoleLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserMinus, Clock, CalendarDays } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { format, subDays } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ date: today });
  const { data: trends, isLoading: isLoadingTrends } = useGetDailyTrend({ days: 30 });
  const { data: stats, isLoading: isLoadingStats } = useGetMemberStats({});

  const presentPercent = summary?.totalMembers ? Math.round((summary.presentToday / summary.totalMembers) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Today's attendance overview & 30-day trends.</p>
        </div>
        <div className="px-4 py-2 bg-muted rounded-md text-sm font-medium flex items-center gap-2 border">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoadingSummary ? "-" : summary?.totalMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">Enrolled in department</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-accent/5 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-accent">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-foreground">{isLoadingSummary ? "-" : summary?.presentToday}</div>
              <span className="text-sm font-medium text-accent">{presentPercent}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Marked as present</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Absent Today</CardTitle>
            <UserMinus className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{isLoadingSummary ? "-" : summary?.absentToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Marked as absent</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-amber-500/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-500">Late / Excused</CardTitle>
            <Clock className="h-4 w-4 text-amber-700 dark:text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {isLoadingSummary ? "-" : `${summary?.lateToday} / ${summary?.excusedToday}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Late / Excused</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Attendance Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {isLoadingTrends ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Loading trends...</div>
              ) : trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(new Date(val), "MMM d")}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                      labelFormatter={(val) => format(new Date(val), "MMM d, yyyy")}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="present" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorPresent)" 
                      name="Present"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="absent" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorAbsent)" 
                      name="Absent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                  No trend data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Attendees</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading stats...</div>
            ) : stats && stats.length > 0 ? (
              <div className="space-y-6">
                {stats.slice(0, 5).map((stat) => (
                  <div key={stat.memberId} className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border">
                      {stat.photoUrl ? (
                        <AvatarImage src={stat.photoUrl} alt={stat.memberName} />
                      ) : (
                        <AvatarFallback className="bg-primary/5 text-primary">
                          {stat.memberName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none text-foreground truncate">{stat.memberName}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{stat.memberMemberId} • {getRoleLabel(stat.role)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-accent">{Math.round(stat.attendanceRate)}%</div>
                      <div className="text-xs text-muted-foreground">{stat.presentDays} days</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                No member stats available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
