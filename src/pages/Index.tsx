import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Map, CalendarDays, Car, AlertTriangle, LayoutDashboard, Sparkles } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import ZoneSafetyPanel from "@/components/ZoneSafetyPanel";
import ItineraryPanel from "@/components/ItineraryPanel";
import EmergencyPanel from "@/components/EmergencyPanel";
import BookingPanel from "@/components/BookingPanel";
import { SkeletonLoader, ChatSkeleton, ZoneSkeleton, CardSkeleton } from "@/components/SkeletonLoader";

const TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "itinerary", label: "Itinerary", icon: CalendarDays },
  { id: "zones", label: "Zones", icon: Map },
  { id: "booking", label: "Booking", icon: Car },
  { id: "emergency", label: "SOS", icon: AlertTriangle },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState("chat");
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  // Mark initial tab as loaded after skeleton delay
  useState(() => {
    setTimeout(() => setLoaded((prev) => ({ ...prev, chat: true })), 900);
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (!loaded[tabId]) {
      setTimeout(() => setLoaded((prev) => ({ ...prev, [tabId]: true })), 900);
    }
  };

  const getSkeleton = () => {
    switch (activeTab) {
      case "chat": return <ChatSkeleton />;
      case "zones": return <ZoneSkeleton />;
      default: return <div className="space-y-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>;
    }
  };

  const getPanel = () => {
    switch (activeTab) {
      case "chat": return <ChatInterface />;
      case "zones": return <ZoneSafetyPanel />;
      case "itinerary": return <ItineraryPanel />;
      case "booking": return <BookingPanel />;
      case "emergency": return <EmergencyPanel />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-6 pb-3 text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            AI Concierge
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Your multilingual hotel companion — 100+ languages</p>
      </motion.header>

      {/* Tab navigation */}
      <nav className="px-4 md:px-8 py-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none justify-center">
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab.id
                ? "clay-button bg-primary text-primary-foreground shadow-lg"
                : "clay-card-sm text-muted-foreground hover:text-foreground hover:bg-white"
                } ${tab.id === "emergency" && activeTab !== "emergency" ? "text-emergency" : ""}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 px-4 md:px-8 pb-8 overflow-hidden">
        <div className={`clay-card-lg p-5 sm:p-8 bg-white/80 backdrop-blur-md rounded-[2.5rem] ${activeTab === "chat" ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`} style={{ height: "calc(100vh - 200px)" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className={activeTab === "chat" ? "flex flex-col flex-1 min-h-0" : ""}
            >
              <SkeletonLoader isLoading={!loaded[activeTab]} skeleton={getSkeleton()} delay={600}>
                {getPanel()}
              </SkeletonLoader>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
