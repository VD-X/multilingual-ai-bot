import { motion } from "framer-motion";
import { BarChart3, MessageSquare, Map, Users, Settings, Bell, TrendingUp, Calendar } from "lucide-react";

const STATS = [
  { label: "Active Chats", value: "24", change: "+12%", icon: MessageSquare },
  { label: "Bookings Today", value: "67", change: "+8%", icon: Calendar },
  { label: "Zone Alerts", value: "2", change: "-1", icon: Map },
  { label: "Guest Satisfaction", value: "4.8", change: "+0.2", icon: TrendingUp },
];

const NAV_ITEMS = [
  "Live Chats", "Bookings", "Zones", "Places", "Taxis", "Restaurants", "Hotels", "Analytics", "Feedback", "Settings"
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold text-foreground">Admin Dashboard</h2>
        <div className="flex items-center gap-2">
          <button className="clay-card-sm p-2 relative">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">3</span>
          </button>
          <button className="clay-card-sm p-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="clay-card p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <stat.icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-zone-green font-medium">{stat.change}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {NAV_ITEMS.map((item, i) => (
          <motion.button
            key={item}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="clay-card-sm p-4 text-sm font-medium text-foreground hover:shadow-lg transition-shadow text-center cursor-pointer"
          >
            {item}
          </motion.button>
        ))}
      </div>

      {/* Recent activity */}
      <div className="clay-card-lg p-5 space-y-3">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Recent Activity
        </h3>
        {[
          { text: "New taxi booking — Room 405 → Airport", time: "2 min ago", type: "booking" },
          { text: "Zone alert: Night Market crowd level HIGH", time: "8 min ago", type: "alert" },
          { text: "Guest feedback: ★★★★★ 'Amazing service!'", time: "15 min ago", type: "feedback" },
          { text: "Restaurant reservation confirmed — Thai Garden", time: "22 min ago", type: "booking" },
          { text: "New guest check-in — Japanese language detected", time: "30 min ago", type: "info" },
        ].map((activity, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <p className="text-sm text-foreground">{activity.text}</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
