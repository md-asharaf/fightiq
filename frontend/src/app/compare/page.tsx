"use client";

import { useState } from "react";
import { ComparisonRadar } from "@/components/compare/ComparisonRadar";
import { TaleOfTheTape } from "@/components/compare/TaleOfTheTape";
import { useFightersList, useCompareFighters } from "@/hooks/compare/useCompareFighters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Swords } from "lucide-react";

export default function ComparePage() {
  const [f1Id, setF1Id] = useState<string>("");
  const [f2Id, setF2Id] = useState<string>("");

  const { data: fighters = [], isLoading: loadingFighters } = useFightersList();
  const { data: comparisonData, isFetching: loadingComparison } = useCompareFighters(f1Id, f2Id);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-8 pb-12">

        {/* Header */}
        <div className="text-center space-y-2 mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-full mb-4">
            <Swords className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Fighter Comparison</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Analyze stylistic matchups and physical advantages with our advanced MMA telemetry radar.
          </p>
        </div>

        {/* Selection Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="space-y-3">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Fighter A</label>
            <Select value={f1Id} onValueChange={(val) => setF1Id(val || "")} disabled={loadingFighters}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Select Fighter (e.g. Jon Jones)" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {fighters.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name} {f.weight_class ? `(${f.weight_class})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Fighter B</label>
            <Select value={f2Id} onValueChange={(val) => setF2Id(val || "")} disabled={loadingFighters}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Select Fighter (e.g. Khabib)" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {fighters.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name} {f.weight_class ? `(${f.weight_class})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Results Area */}
        {!f1Id || !f2Id ? (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-xl">
            <p className="text-xl font-medium text-muted-foreground">Select two fighters to view their Tale of the Tape.</p>
          </div>
        ) : loadingComparison ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <Skeleton className="w-full h-[400px] rounded-xl" />
            <Skeleton className="w-full h-[400px] rounded-xl" />
          </div>
        ) : comparisonData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Tale of the Tape (Left) */}
            <TaleOfTheTape
              fighter1={comparisonData.fighter1}
              fighter2={comparisonData.fighter2}
            />

            {/* Radar Chart (Right) */}
            <div className="flex flex-col">
              <div className="mb-4">
                <h3 className="font-extrabold text-xl tracking-tight mb-2">Stylistic Radar</h3>
                <p className="text-sm text-muted-foreground">Volume and Accuracy across striking and grappling metrics.</p>
              </div>
              <ComparisonRadar
                fighter1={comparisonData.fighter1}
                fighter2={comparisonData.fighter2}
              />
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}
