import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SkeletonLoaderProps {
  isLoading: boolean;
  children: ReactNode;
  skeleton: ReactNode;
  delay?: number;
}

export function SkeletonLoader({ isLoading, children, skeleton, delay = 800 }: SkeletonLoaderProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShowContent(true), delay);
      return () => clearTimeout(timer);
    }
    setShowContent(false);
  }, [isLoading, delay]);

  return (
    <AnimatePresence mode="wait">
      {!showContent ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          {skeleton}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col flex-1 min-h-0 h-full"
        >
          <div className="flex flex-col flex-1 min-h-0 h-full">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <div className={`skeleton-pulse ${i % 2 === 0 ? "w-3/4" : "w-1/2"} h-14 rounded-2xl`} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="clay-card p-5 space-y-3">
      <div className="skeleton-pulse h-5 w-1/3" />
      <div className="skeleton-pulse h-4 w-2/3" />
      <div className="skeleton-pulse h-4 w-1/2" />
    </div>
  );
}

export function ZoneSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="clay-card p-4 space-y-2">
          <div className="skeleton-pulse h-5 w-1/2" />
          <div className="skeleton-pulse h-3 w-full" />
          <div className="skeleton-pulse h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
