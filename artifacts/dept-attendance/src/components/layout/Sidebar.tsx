import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, CalendarCheck, FileBarChart2 } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Members",
      path: "/members",
      icon: Users,
    },
    {
      name: "Attendance",
      path: "/attendance",
      icon: CalendarCheck,
    },
    {
      name: "Reports",
      path: "/reports",
      icon: FileBarChart2,
    },
  ];

  return (
    <aside className="w-64 border-r bg-card min-h-screen flex flex-col h-full flex-shrink-0 relative sticky top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            CS
          </span>
          Attendance
        </h1>
        <p className="text-xs text-muted-foreground mt-1 tracking-wide">Digital Literacy & Computer Education Department</p>
      </div>
      <nav className="flex-1 px-4 space-y-1.5 mt-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4",
                  isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t mt-auto">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border text-xs font-semibold text-muted-foreground">
            DH
          </div>
          <div>
            <p className="text-sm font-medium leading-tight text-foreground">Dept Head</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
