"use client";

import { useState } from "react";
import { ComparisonRadar } from "@/components/compare/ComparisonRadar";
import { TaleOfTheTape } from "@/components/compare/TaleOfTheTape";
import { useCompareFighters } from "@/hooks/compare/useCompareFighters";
import { FighterSelect } from "@/components/compare/FighterSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ComparePage() {
  const [f1Id, setF1Id] = useState<string>("");
  const [f2Id, setF2Id] = useState<string>("");

  const { data: comparisonData, isFetching: loadingComparison } = useCompareFighters(f1Id, f2Id);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background p-4 md:p-8 lg:p-12 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/10 via-background to-background z-0 pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full space-y-8 md:space-y-12 pb-12 z-10 relative">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-8 md:mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-red-600 text-white rounded-none border-2 border-red-600 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] transition-all">
            <Swords className="h-10 w-10 md:h-12 md:w-12" strokeWidth={2} />
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase">Matchup Analysis</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-wider text-sm md:text-base lg:text-lg max-w-3xl mx-auto">
            Evaluate stylistic advantages, physical measurements, and career telemetry in the ultimate Tale of the Tape.
          </p>
        </motion.div>

        {/* Selection Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-8 items-center bg-card p-6 md:p-8 rounded-none border-2 border-border"
        >
          <div className="space-y-4 relative">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-none bg-red-600 animate-pulse border border-black/50" />
              <label className="text-xs md:text-sm font-black text-red-600 uppercase tracking-widest">Red Corner</label>
            </div>
            <FighterSelect value={f1Id} onChange={setF1Id} placeholder="Select Red Corner Fighter..." />
          </div>

          <div className="hidden md:flex flex-col items-center justify-center pt-8">
            <div className="bg-background px-4 py-2 rounded-none border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]">
              <span className="text-sm font-black text-foreground uppercase tracking-widest">VS</span>
            </div>
          </div>

          <div className="space-y-4 relative">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-none bg-blue-600 animate-pulse border border-black/50" />
              <label className="text-xs md:text-sm font-black text-blue-600 uppercase tracking-widest">Blue Corner</label>
            </div>
            <FighterSelect value={f2Id} onChange={setF2Id} placeholder="Select Blue Corner Fighter..." />
          </div>
        </motion.div>

        {/* Comparison Results Area */}
        <AnimatePresence mode="wait">
          {!f1Id || !f2Id ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 md:py-32 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-none bg-card/50"
            >
              <Shield className="h-16 w-16 text-muted-foreground/30 mb-6" strokeWidth={2} />
              <p className="text-2xl md:text-3xl font-black uppercase text-muted-foreground tracking-tight">Step into the Octagon</p>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-2">Select two fighters above to generate the matchup telemetry.</p>
            </motion.div>
          ) : loadingComparison ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8"
            >
              <Skeleton className="w-full h-[500px] rounded-none bg-card" />
              <Skeleton className="w-full h-[500px] rounded-none bg-card" />
            </motion.div>
          ) : comparisonData ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 md:gap-8 mt-8"
            >
              {/* Tale of the Tape (Left) */}
              <div className="bg-card border-2 border-border rounded-none p-6 flex flex-col h-full overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
                <TaleOfTheTape
                  fighter1={comparisonData.fighter1}
                  fighter2={comparisonData.fighter2}
                />
              </div>

              {/* Radar Chart (Right) */}
              <div className="bg-card border-2 border-border rounded-none p-6 md:p-8 flex flex-col items-center justify-center h-full relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
                <div className="w-full text-center mb-6 relative z-10">
                  <h3 className="font-black text-3xl md:text-4xl tracking-tighter uppercase text-foreground">Stylistic Telemetry</h3>
                  <p className="text-sm font-bold uppercase text-muted-foreground mt-2 tracking-wider">Volume and Accuracy across striking and grappling.</p>
                </div>
                <div className="w-full max-w-lg aspect-square relative z-10 scale-110">
                  <ComparisonRadar
                    fighter1={comparisonData.fighter1}
                    fighter2={comparisonData.fighter2}
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
