import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, Clock, Wallet, ChevronDown, ChevronUp,
  Utensils, Landmark, TreePine, ShoppingBag, Car, Sun, Sparkles, Trash2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────
interface ItineraryItem {
  time: string;
  activity: string;
  place: string;
  cost: number;
  category: "Culture" | "Food" | "Nature" | "Shopping" | "Travel" | string;
  tip?: string;
}

interface DayPlan {
  day: number;
  theme: string;
  items: ItineraryItem[];
}

interface ItineraryPlan {
  destination: string;
  days: number;
  budget_total: number;
  budget_currency: string;
  generated_at?: string;
  days_plan: DayPlan[];
}

// ─── Category helpers ──────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Culture: { icon: Landmark, color: "text-purple-600", bg: "bg-purple-50" },
  Food: { icon: Utensils, color: "text-orange-500", bg: "bg-orange-50" },
  Nature: { icon: TreePine, color: "text-green-600", bg: "bg-green-50" },
  Shopping: { icon: ShoppingBag, color: "text-pink-500", bg: "bg-pink-50" },
  Travel: { icon: Car, color: "text-blue-500", bg: "bg-blue-50" },
};

const DAY_COLORS = [
  "from-primary/80 to-primary",
  "from-accent/80 to-accent",
  "from-emerald-500/80 to-emerald-500",
  "from-purple-500/80 to-purple-500",
  "from-orange-500/80 to-orange-500",
  "from-pink-500/80 to-pink-500",
];

const getCategoryMeta = (cat: string) =>
  CATEGORY_META[cat] ?? { icon: Sparkles, color: "text-muted-foreground", bg: "bg-muted/40" };

const formatBudget = (amount: number, currency: string) => {
  if (currency === "INR" || currency === "₹") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
};

const calcDayTotal = (items: ItineraryItem[]) =>
  items.reduce((sum, it) => sum + (it.cost || 0), 0);

// ─── Day Card ─────────────────────────────────────────────────────────────
const DayCard = ({ day, plan, colorClass }: { day: number; plan: DayPlan; colorClass: string }) => {
  const [open, setOpen] = useState(day === 1); // first day open by default
  const total = calcDayTotal(plan.items);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: day * 0.06, type: "spring", stiffness: 200 }}
      className="clay-card-lg rounded-[1.5rem] overflow-hidden bg-white/80 backdrop-blur-md border border-white/60 shadow-sm"
    >
      {/* Day header */}
      <button
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClass} flex flex-col items-center justify-center flex-shrink-0 shadow-md`}>
          <span className="text-[10px] font-bold text-white/80 leading-none">DAY</span>
          <span className="text-lg font-black text-white leading-none">{plan.day}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{plan.theme}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            Est. spend: <span className="font-semibold text-foreground">₹{total.toLocaleString("en-IN")}</span>
            &nbsp;·&nbsp;{plan.items.length} activities
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Activity list */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="relative px-4 pb-4 space-y-0">
              {/* Timeline line */}
              <div className="absolute left-[2.05rem] top-0 bottom-4 w-0.5 bg-gradient-to-b from-primary/20 to-transparent" />

              {plan.items.map((item, i) => {
                const meta = getCategoryMeta(item.category);
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="relative flex gap-3 pt-3"
                  >
                    {/* Timeline dot */}
                    <div className={`relative z-10 w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm`}>
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    </div>

                    <div className="flex-1 pb-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {item.time}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                              {item.category}
                            </span>
                          </div>
                          <p className="font-semibold text-sm text-foreground">{item.activity}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {item.place}
                          </p>
                          {item.tip && (
                            <p className="text-[10px] text-primary/80 mt-1 italic bg-primary/5 px-2 py-1 rounded-lg">
                              💡 {item.tip}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold text-foreground">
                            {item.cost === 0 ? "Free" : `₹${item.cost.toLocaleString("en-IN")}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────
export default function ItineraryPanel() {
  const [plan, setPlan] = useState<ItineraryPlan | null>(null);

  const loadPlan = () => {
    try {
      const saved = localStorage.getItem("current_itinerary");
      if (saved) setPlan(JSON.parse(saved));
    } catch {
      setPlan(null);
    }
  };

  useEffect(() => {
    loadPlan();

    const handleSync = (e: StorageEvent) => {
      if (e.key === "current_itinerary") loadPlan();
    };

    window.addEventListener("itinerary_updated", loadPlan);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("itinerary_updated", loadPlan);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const clearPlan = () => {
    localStorage.removeItem("current_itinerary");
    setPlan(null);
  };

  // Total spent across all days
  const totalSpent = plan
    ? plan.days_plan.reduce((sum, d) => sum + calcDayTotal(d.items), 0)
    : 0;
  const budgetUsedPct = plan ? Math.min((totalSpent / plan.budget_total) * 100, 100) : 0;
  const savings = plan ? plan.budget_total - totalSpent : 0;

  // ── Empty state ──
  if (!plan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-foreground">Itinerary</h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="clay-card-lg p-8 rounded-[2rem] bg-white/70 backdrop-blur-md border border-white/50 text-center space-y-5"
        >
          <div className="w-20 h-20 rounded-[1.5rem] bg-primary/10 flex items-center justify-center mx-auto text-4xl shadow-inner">
            🗓️
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground mb-2">No Itinerary Yet</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Ask the AI to plan a trip with your budget and it will appear here automatically.
            </p>
          </div>

          <div className="bg-primary/5 rounded-2xl p-4 text-left space-y-2 border border-primary/10 max-w-sm mx-auto">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">Try saying in Chat:</p>
            <div className="space-y-2">
              {[
                "Plan a 3-day trip to Goa for ₹15,000",
                "Budget trip to Rajasthan for 5 days, ₹25,000",
                "Plan a 2-day trip to Agra under ₹8,000",
              ].map((ex, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-white/60 px-3 py-2 rounded-xl">
                  <span className="text-primary font-bold flex-shrink-0">💬</span>
                  <em>"{ex}"</em>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Plan display ──
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {plan.destination}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {plan.days} day{plan.days > 1 ? "s" : ""} trip
            {plan.generated_at && (
              <span>· Created {new Date(plan.generated_at).toLocaleDateString()}</span>
            )}
          </p>
        </div>
        <button
          onClick={clearPlan}
          className="p-2 rounded-full hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
          title="Clear itinerary"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Budget overview card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="clay-card-lg p-5 rounded-[1.5rem] bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-foreground">Budget Overview</span>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
            {plan.days} Days
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total Budget</p>
            <p className="text-base font-black text-foreground mt-0.5">{formatBudget(plan.budget_total, plan.budget_currency)}</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Est. Spend</p>
            <p className="text-base font-black text-primary mt-0.5">{formatBudget(totalSpent, plan.budget_currency)}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${savings >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              {savings >= 0 ? "Savings" : "Over Budget"}
            </p>
            <p className={`text-base font-black mt-0.5 ${savings >= 0 ? "text-green-600" : "text-red-500"}`}>
              {savings >= 0 ? "+" : ""}{formatBudget(Math.abs(savings), plan.budget_currency)}
            </p>
          </div>
        </div>

        {/* Budget bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span>Budget used</span>
            <span>{Math.round(budgetUsedPct)}%</span>
          </div>
          <div className="h-2 bg-white/80 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${budgetUsedPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${budgetUsedPct > 90 ? "bg-red-400" : "bg-primary"}`}
            />
          </div>
        </div>
      </motion.div>

      {/* Day-by-day cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-gold" />
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Day-by-Day Plan</h3>
        </div>
        {plan.days_plan.map((dayPlan) => (
          <DayCard
            key={dayPlan.day}
            day={dayPlan.day}
            plan={dayPlan}
            colorClass={DAY_COLORS[(dayPlan.day - 1) % DAY_COLORS.length]}
          />
        ))}
      </div>
    </div>
  );
}
