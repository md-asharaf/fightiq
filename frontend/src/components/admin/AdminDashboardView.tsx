"use client";

import { useState } from "react";
import { Upload, Database, Globe, RefreshCcw, Trash2, Loader2 } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function AdminDashboardView() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { documents, totalDocuments, isLoading, isFetching, uploading, triggeringUfcStats, triggeringRankings, loadDocuments, triggerUfcStats, triggerRankings, uploadDoc, deleteDoc } = useAdmin(page, pageSize);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("fighters");
  const [scrapeStatus, setScrapeStatus] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalPages = Math.ceil(totalDocuments / pageSize) || 1;

  const handleTriggerUfcStats = async () => {
    try {
      await triggerUfcStats();
      toast.success("UFCStats ETL task has been queued successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger UFCStats ETL.");
    }
  };

  const handleTriggerRankings = async () => {
    try {
      await triggerRankings();
      toast.success("Rankings ETL task has been queued successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger Rankings ETL.");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      await uploadDoc(file, category);
      toast.success("Document uploaded successfully!");
      setFile(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document.");
    }
  };

  interface ProgressData {
    topic?: string;
    chunks?: number;
    message?: string;
  }

  const handleScrape = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = formData.get("url") as string;
    const currentCategory = formData.get("scrapeCategory") as string || category;
    if (!url) return;

    setScrapeStatus("Connecting...");

    import("@/lib/api").then(({ streamScrape }) => {
      streamScrape([url], currentCategory, {
        onProgress: (status, data: unknown) => {
          const progressData = data as ProgressData;
          if (status === "scraping") setScrapeStatus(`Scraping ${progressData.topic}...`);
          else if (status === "embedding") setScrapeStatus(`Vectorizing ${progressData.topic}...`);
          else if (status === "embedded") setScrapeStatus(`Indexed ${progressData.chunks} chunks for ${progressData.topic}`);
          else if (status === "error") setScrapeStatus(`Error: ${progressData.message}`);
        },
        onError: (err) => {
          setScrapeStatus(`Failed: ${err.message}`);
          setTimeout(() => setScrapeStatus(""), 3000);
        },
        onComplete: () => {
          setScrapeStatus("Complete!");
          setTimeout(() => setScrapeStatus(""), 2000);
          (e.target as HTMLFormElement).reset();
          loadDocuments();
        }
      });
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-8 md:space-y-12 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-foreground pb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">Knowledge Base Admin</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-wider text-sm mt-3">Manage UFC documents, trigger seeding, and run web scrapers.</p>
        </div>

        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button disabled={triggeringUfcStats} variant="outline" className="border-2 border-foreground text-foreground hover:bg-foreground hover:text-background rounded-none h-12 font-black uppercase tracking-widest transition-colors w-full sm:w-auto" />}
            >
              {triggeringUfcStats ? <RefreshCcw className="mr-2 h-5 w-5 md:h-6 md:w-6 animate-spin" /> : <Database className="mr-2 h-5 w-5 md:h-6 md:w-6" />}
              {triggeringUfcStats ? "Queueing..." : "Sync UFCStats"}
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-none border-2 border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-black uppercase tracking-wider text-xl">Trigger UFCStats ETL?</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-muted-foreground">
                  This will queue a background task to scrape ufcstats.com and update all historical fighter statistics in the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none font-bold uppercase tracking-wider">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleTriggerUfcStats} className="bg-red-600 text-white hover:bg-red-700 rounded-none font-black uppercase tracking-widest">Start Sync</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger
              render={<Button disabled={triggeringRankings} className="bg-red-600 hover:bg-red-700 text-white rounded-none h-12 font-black uppercase tracking-widest transition-colors w-full sm:w-auto" />}
            >
              {triggeringRankings ? <RefreshCcw className="mr-2 h-5 w-5 md:h-6 md:w-6 animate-spin" /> : <RefreshCcw className="mr-2 h-5 w-5 md:h-6 md:w-6" />}
              {triggeringRankings ? "Queueing..." : "Sync Rankings"}
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-none border-2 border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-black uppercase tracking-wider text-xl">Trigger Rankings Sync?</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-muted-foreground">
                  This will queue a background task to fetch live UFC rankings from Parse.bot and update the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none font-bold uppercase tracking-wider">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleTriggerRankings} className="bg-red-600 text-white hover:bg-red-700 rounded-none font-black uppercase tracking-widest">Start Sync</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Card */}
        <Card className="bg-card border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] rounded-none">
          <CardHeader className="border-b-2 border-border bg-muted/50 p-6">
            <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl font-black tracking-tighter uppercase text-foreground"><Upload className="h-6 w-6 md:h-8 md:w-8 text-red-600" /> Upload Document</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-xs tracking-wider mt-2">Upload a local Markdown, PDF, or text file.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="category" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={(val) => setCategory(val || "fighters")}>
                  <SelectTrigger id="category" className="bg-background border-2 border-border text-foreground h-14 text-base font-bold rounded-none focus:ring-0 focus:border-red-600 transition-colors">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-2 border-border text-foreground rounded-none shadow-none">
                    <SelectItem value="fighters" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">Fighters</SelectItem>
                    <SelectItem value="events" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">Events</SelectItem>
                    <SelectItem value="history" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">History</SelectItem>
                    <SelectItem value="rules" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">Rules</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="file" className="text-xs font-black uppercase tracking-widest text-muted-foreground">File</Label>
                <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required className="bg-background border-2 border-border text-foreground h-14 focus-visible:ring-0 focus-visible:border-red-600 rounded-none file:text-red-600 file:font-black file:uppercase file:tracking-widest" />
              </div>
              <Button type="submit" disabled={!file || uploading} className="w-full bg-foreground hover:bg-muted-foreground text-background h-14 font-black uppercase tracking-widest rounded-none transition-colors">
                {uploading ? <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin mx-auto" /> : "Upload & Process"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Scrape Card */}
        <Card className="bg-card border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] rounded-none">
          <CardHeader className="border-b-2 border-border bg-muted/50 p-6">
            <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl font-black tracking-tighter uppercase text-foreground"><Globe className="h-6 w-6 md:h-8 md:w-8 text-red-600" /> Web Scraper</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-xs tracking-wider mt-2">Scrape knowledge from Wikipedia, ufc.com, or ufcstats.com.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleScrape} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="scrapeCategory" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</Label>
                <Select name="scrapeCategory" defaultValue={category} onValueChange={(val) => setCategory(val || "fighters")}>
                  <SelectTrigger id="scrapeCategory" className="bg-background border-2 border-border text-foreground h-14 text-base font-bold rounded-none focus:ring-0 focus:border-red-600 transition-colors">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-2 border-border text-foreground rounded-none shadow-none">
                    <SelectItem value="fighters" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">Fighters</SelectItem>
                    <SelectItem value="events" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">Events</SelectItem>
                    <SelectItem value="history" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">History</SelectItem>
                    <SelectItem value="rules" className="focus:bg-red-600 focus:text-white rounded-none cursor-pointer font-bold uppercase tracking-wider">Rules</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="url" className="text-xs font-black uppercase tracking-widest text-muted-foreground">URL / Topic</Label>
                <Input id="url" name="url" defaultValue="" placeholder="https://ufcstats.com/... or Topic Name" required className="bg-background border-2 border-border text-foreground h-14 focus-visible:ring-0 focus-visible:border-red-600 rounded-none placeholder:text-muted-foreground font-bold" />
              </div>

              {scrapeStatus ? (
                <div className="p-4 bg-muted/50 border-2 border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Status</span>
                    <span className="text-xs md:text-sm font-black uppercase tracking-widest text-red-600 animate-pulse flex items-center gap-2"><Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> {scrapeStatus}</span>
                  </div>
                </div>
              ) : (
                <Button type="submit" className="w-full bg-foreground hover:bg-muted-foreground text-background h-14 font-black uppercase tracking-widest rounded-none transition-colors">Scrape & Process</Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)] rounded-none">
        <CardHeader className="flex flex-row items-center justify-between border-b-2 border-border bg-muted/50 p-6">
          <div>
            <CardTitle className="text-2xl font-black tracking-tighter uppercase text-foreground">Ingested Documents</CardTitle>
            <CardDescription className="text-muted-foreground font-bold uppercase text-xs tracking-wider mt-2">Vectorized chunks ready for RAG and Quiz generation.</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => loadDocuments()} disabled={isFetching} className="border-2 border-foreground text-foreground hover:bg-foreground hover:text-background rounded-none h-10 w-10 md:h-12 md:w-12">
            <RefreshCcw className={`h-4 w-4 md:h-5 md:w-5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-2 border-border">
                  <TableHead className="font-bold uppercase tracking-wider text-xs h-12">Title</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs h-12">Category</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs h-12">Source</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-xs h-12">Date Ingested</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin mx-auto text-red-600" />
                        <span className="font-bold uppercase tracking-wider text-sm md:text-base">Loading Documents...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <Database className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/30" />
                        <p className="font-black uppercase tracking-wider text-sm md:text-base">No documents ingested yet.</p>
                        <p className="text-xs md:text-sm font-bold uppercase tracking-wider">Seed or upload some data to get started!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="font-bold text-foreground text-sm">{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-none uppercase tracking-widest font-black text-[10px] bg-red-600/10 text-red-600 hover:bg-red-600/20">{doc.category}</Badge>
                      </TableCell>
                      <TableCell className="truncate max-w-[200px] text-muted-foreground font-bold text-sm" title={doc.source}>
                        {doc.source.startsWith("http") ? <a href={doc.source} target="_blank" rel="noreferrer" className="hover:text-red-600 transition-colors underline decoration-border underline-offset-4">Link</a> : doc.source}
                      </TableCell>
                      <TableCell className="font-bold text-sm text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" disabled={deletingId === doc.id} onClick={async () => {
                          try {
                            setDeletingId(doc.id);
                            await deleteDoc(doc.id);
                            toast.success("Document deleted!");
                          } catch (err: unknown) {
                            toast.error(err instanceof Error ? err.message : "Failed to delete document.");
                          } finally {
                            setDeletingId(null);
                          }
                        }} className="text-muted-foreground hover:text-white hover:bg-red-600 rounded-none h-10 w-10 md:h-12 md:w-12">
                          {deletingId === doc.id ? <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" /> : <Trash2 className="h-5 w-5 md:h-6 md:w-6" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t-2 border-border bg-muted/30">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Showing page <span className="font-black text-foreground">{page}</span> of <span className="font-black text-foreground">{totalPages}</span> ({totalDocuments} total)
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                    className="h-10 w-10 rounded-none border-2 border-border text-foreground hover:bg-foreground hover:text-background transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isFetching}
                    className="h-10 w-10 rounded-none border-2 border-border text-foreground hover:bg-foreground hover:text-background transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
