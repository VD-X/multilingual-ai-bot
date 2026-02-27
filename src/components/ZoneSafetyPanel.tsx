import { motion } from "framer-motion";
import { Shield, Users, Cloud, DollarSign, Star } from "lucide-react";
import { MOCK_ZONES, type Zone } from "@/lib/concierge-data";

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-muted-foreground w-6 flex justify-center">{icon}</div>
      <span className="text-foreground/80 font-medium w-20">{label}</span>
      <div className="flex-1 h-2.5 clay-inset bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className={`h-full rounded-full shadow-inner ${value >= 70 ? "bg-zone-green shadow-zone-green/40" : value >= 40 ? "bg-zone-yellow shadow-zone-yellow/40" : "bg-zone-red shadow-zone-red/40"}`}
        />
      </div>
      <span className="text-muted-foreground w-10 text-right font-bold text-[13px]">{value}</span>
    </div>
  );
}

function ZoneCard({ zone, index }: { zone: Zone; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
      className="clay-card rounded-[2rem] p-6 space-y-5 bg-white/70 backdrop-blur-md border border-white/50"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-lg text-foreground">{zone.name}</h4>
        <span className={`zone-${zone.color} text-[11px] font-bold px-3.5 py-1.5 rounded-full uppercase shadow-sm`}>
          {zone.color}
        </span>
      </div>
      <div className="space-y-3">
        <ScoreBar label="Safety" value={zone.safetyScore} icon={<Shield className="w-4 h-4" />} />
        <ScoreBar label="Crowd" value={zone.crowdScore} icon={<Users className="w-4 h-4" />} />
        <ScoreBar label="Weather" value={zone.weatherScore} icon={<Cloud className="w-4 h-4" />} />
        <ScoreBar label="Price" value={zone.priceScore} icon={<DollarSign className="w-4 h-4" />} />
        <ScoreBar label="Reviews" value={zone.reviewScore} icon={<Star className="w-4 h-4" />} />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border/60">
        <span className="text-sm font-semibold text-muted-foreground">Overall Score</span>
        <span className={`text-2xl font-black drop-shadow-sm ${zone.overallScore >= 70 ? "text-zone-green" : zone.overallScore >= 40 ? "text-gold" : "text-zone-red"}`}>
          {zone.overallScore}
        </span>
      </div>
    </motion.div>
  );
}

export default function ZoneSafetyPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Zone Intelligence</h2>
        <span className="text-xs font-bold text-muted-foreground clay-card-sm px-4 py-2 rounded-full bg-white/60 border border-white/50">Updated 12 min ago</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MOCK_ZONES.map((zone, i) => (
          <ZoneCard key={zone.id} zone={zone} index={i} />
        ))}
      </div>
    </div>
  );
}
