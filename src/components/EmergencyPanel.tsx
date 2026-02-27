import { motion } from "framer-motion";
import { Phone, AlertTriangle, MapPin } from "lucide-react";
import { EMERGENCY_CONTACTS } from "@/lib/concierge-data";

export default function EmergencyPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emergency/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-emergency" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">Emergency Contacts</h2>
      </div>

      {/* SOS Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        className="w-full py-6 rounded-full bg-destructive text-destructive-foreground font-black text-xl shadow-lg shadow-destructive/40 flex items-center justify-center gap-3 clay-inset"
      >
        <AlertTriangle className="w-7 h-7" />
        SOS — Send Emergency Alert
      </motion.button>
      <p className="text-sm font-medium text-muted-foreground text-center">Sends your GPS location & hotel contact to emergency services</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EMERGENCY_CONTACTS.map((contact, i) => (
          <motion.a
            key={i}
            href={`tel:${contact.number}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="clay-card rounded-3xl p-5 flex items-center gap-4 hover:shadow-xl transition-all cursor-pointer bg-white/70 backdrop-blur-md border border-white/50 group"
          >
            <span className="text-3xl drop-shadow-sm">{contact.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-[15px] text-foreground group-hover:text-primary transition-colors">{contact.label}</p>
              <p className="text-sm font-medium text-muted-foreground">{contact.number}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors group-hover:shadow-md">
              <Phone className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
            </div>
          </motion.a>
        ))}
      </div>

      <div className="clay-card rounded-3xl p-6 flex items-center gap-4 bg-white/70 backdrop-blur-md border border-white/50">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <p className="font-bold text-[15px] text-foreground">Nearest Hospital</p>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">Bangkok Hospital — 2.3 km away (8 min by car)</p>
        </div>
      </div>
    </div>
  );
}
