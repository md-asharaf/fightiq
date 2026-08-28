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
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 via-background to-background z-0 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full space-y-8 md:space-y-12 pb-12 z-10 relative">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-8 md:mb-12"
        >
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 text-primary rounded-2xl shadow-sm border border-primary/20 backdrop-blur-md">
            <Swords className="h-10 w-10 md:h-12 md:w-12" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase drop-shadow-sm">Matchup Analysis</h1>
          <p className="text-muted-foreground text-base md:text-lg lg:text-xl max-w-3xl mx-auto font-medium">
            Evaluate stylistic advantages, physical measurements, and career telemetry in the ultimate Tale of the Tape.
          </p>
        </motion.div>

        {/* Selection Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-8 items-center bg-card/60 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-border/50 shadow-sm"
        >
          <div className="space-y-4 relative">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
              <label className="text-xs md:text-sm font-black text-red-500/80 uppercase tracking-widest">Red Corner</label>
            </div>
            <FighterSelect value={f1Id} onChange={setF1Id} placeholder="Select Red Corner Fighter..." />
          </div>

          <div className="hidden md:flex flex-col items-center justify-center pt-8">
            <div className="bg-background/80 backdrop-blur-md px-4 py-2 rounded-xl border border-border/50 shadow-sm">
              <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">VS</span>
            </div>
          </div>

          <div className="space-y-4 relative">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <label className="text-xs md:text-sm font-black text-blue-500/80 uppercase tracking-widest">Blue Corner</label>
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
              className="py-24 md:py-32 flex flex-col items-center justify-center text-center border-2 border-dashed border-border/50 rounded-3xl bg-card/30 backdrop-blur-sm"
            >
              <Shield className="h-16 w-16 text-muted-foreground/30 mb-6" strokeWidth={1} />
              <p className="text-xl md:text-2xl font-bold text-muted-foreground tracking-tight">Step into the Octagon</p>
              <p className="text-sm text-muted-foreground mt-2">Select two fighters above to generate the matchup telemetry.</p>
            </motion.div>
          ) : loadingComparison ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8"
            >
              <Skeleton className="w-full h-[500px] rounded-3xl bg-card/50" />
              <Skeleton className="w-full h-[500px] rounded-3xl bg-card/50" />
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
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col h-full overflow-hidden">
                <TaleOfTheTape
                  fighter1={comparisonData.fighter1}
                  fighter2={comparisonData.fighter2}
                />
              </div>

              {/* Radar Chart (Right) */}
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-none p-6 md:p-8 shadow-sm flex flex-col items-center justify-center h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                <div className="w-full text-center mb-6 relative z-10">
                  <h3 className="font-black text-2xl md:text-3xl tracking-tight uppercase">Stylistic Telemetry</h3>
                  <p className="text-sm font-medium text-muted-foreground mt-2">Volume and Accuracy across striking and grappling.</p>
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
