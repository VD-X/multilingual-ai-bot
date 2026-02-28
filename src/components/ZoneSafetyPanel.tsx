import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Cloud, DollarSign, Star, CloudRain, Sun, Thermometer, Loader2, MapPin } from "lucide-react";
import type { Zone } from "@/lib/concierge-data";

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
      className="clay-card rounded-[2rem] p-6 space-y-5 bg-white/70 backdrop-blur-md border border-white/50 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-lg text-foreground truncate pr-2">{zone.name}</h4>
        <span className={`zone-${zone.color} text-[11px] font-bold px-3.5 py-1.5 rounded-full uppercase shadow-sm shrink-0`}>
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
  const [zones, setZones] = useState<Zone[]>([]);
  const [weatherCtx, setWeatherCtx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchZones() {
      try {
        const userLoc = localStorage.getItem("current_user_location");
        let lat = 26.9124; // default jaipur
        let lon = 75.7873;
        if (userLoc) {
          const parts = userLoc.split(",");
          lat = parseFloat(parts[0]);
          lon = parseFloat(parts[1]);
        }
        const res = await fetch(`http://127.0.0.1:8000/api/v1/zones?lat=${lat}&lon=${lon}`);
        if (!res.ok) throw new Error("Failed to load live zones");
        const data = await res.json();
        setZones(data.zones);
        setWeatherCtx(data.weather_context);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchZones();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Zone Intelligence</h2>
        <span className="text-xs font-bold text-muted-foreground clay-card-sm px-4 py-2 rounded-full bg-white/60 border border-white/50">Live</span>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-12 bg-white/40 rounded-[2rem] border border-white/40"
          >
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Syncing live weather & zones...</p>
          </motion.div>
        ) : error ? (
          <motion.div key="error" className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-sm font-medium">
            {error}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Live Weather Banner */}
            {weatherCtx && (
              <div className="clay-card rounded-3xl p-5 bg-gradient-to-br from-primary/5 to-primary/10 border border-white/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-2xl">
                    {weatherCtx.is_raining ? "🌧️" : weatherCtx.is_extreme_heat ? "🥵" : "☀️"}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {weatherCtx.temperature}°C
                      <span className="text-sm font-medium text-muted-foreground bg-white/50 px-2 py-0.5 rounded-full">{weatherCtx.condition}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Live Weather Context
                    </p>
                  </div>
                </div>
                {weatherCtx.is_raining && (
                  <div className="text-xs font-bold text-amber-700 bg-amber-100/80 px-4 py-2 rounded-xl flex items-center gap-2">
                    <CloudRain className="w-4 h-4" /> Safety & Crowd scores adjusted for rain
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {zones.map((zone, i) => (
                <ZoneCard key={zone.id} zone={zone} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
