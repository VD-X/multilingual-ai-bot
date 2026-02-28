import React from 'react';
import { motion } from 'framer-motion';
import { Star, Phone, Map, Globe, ShieldCheck } from 'lucide-react';
import { MOCK_GUIDES } from '../lib/concierge-data';

interface NearbyGuidesProps {
    coords: [number, number]; // [lat, lng]
    label: string; // e.g. "Your Location" or "India Gate, New Delhi"
}

export const NearbyGuides: React.FC<NearbyGuidesProps> = ({ coords, label }) => {
    return (
        <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Available Guides near {label}
                </p>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                    {MOCK_GUIDES.length} Found
                </span>
            </div>

            <div className="grid gap-3">
                {MOCK_GUIDES.map((guide, idx) => (
                    <motion.div
                        key={guide.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group flex flex-col sm:flex-row gap-4 p-4 rounded-3xl bg-white border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all relative overflow-hidden"
                    >
                        {/* Left side: Avatar & Availability */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 font-display font-bold text-xl flex items-center justify-center relative shadow-sm">
                                {guide.avatar}
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${guide.availability === "Available Now" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {guide.availability}
                            </span>
                        </div>

                        {/* Middle: Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-foreground text-sm sm:text-base truncate pr-2">
                                    {guide.name}
                                </h3>
                                <div className="flex items-center gap-1 text-xs shrink-0 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded-md">
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                    <span className="font-bold">{guide.rating}</span>
                                    <span className="text-muted-foreground">({guide.reviews})</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-2">
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mr-2">
                                    <Globe className="w-3 h-3 text-emerald-500" />
                                    {guide.languages.join(", ")}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {guide.specialties.map((spec, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] uppercase font-semibold">
                                        {spec}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg font-bold text-foreground">₹{guide.pricePerDay}</span>
                                    <span className="text-[10px] text-muted-foreground tracking-wide uppercase">/ day</span>
                                </div>
                            </div>
                        </div>

                        {/* Right / Bottom Action */}
                        <div className="flex sm:flex-col justify-end items-end shrink-0 gap-2 mt-2 sm:mt-0">
                            <a
                                href={`tel:${guide.contact}`}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                <span>Contact</span>
                            </a>
                        </div>

                    </motion.div>
                ))}
            </div>
        </div>
    );
};
