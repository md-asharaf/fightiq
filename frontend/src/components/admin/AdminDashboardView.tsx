"use client";

import { useState } from "react";
import { Upload, Database, Globe, RefreshCcw, Trash2 } from "lucide-react";
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
    <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6 md:space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Knowledge Base Admin</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage UFC documents, trigger seeding, and run web scrapers.</p>
        </div>

        <div className="flex gap-4">
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button disabled={triggeringUfcStats} variant="outline" className="border-primary text-primary hover:bg-primary/10 rounded-none" />}
            >
              {triggeringUfcStats ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              {triggeringUfcStats ? "Queueing..." : "Sync UFCStats"}
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-none border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Trigger UFCStats ETL?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will queue a background task to scrape ufcstats.com and update all historical fighter statistics in the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleTriggerUfcStats} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none">Start Sync</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger
              render={<Button disabled={triggeringRankings} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none" />}
            >
              {triggeringRankings ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              {triggeringRankings ? "Queueing..." : "Sync Rankings"}
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-none border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Trigger Rankings Sync?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will queue a background task to fetch live UFC rankings from Parse.bot and update the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleTriggerRankings} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none">Start Sync</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Card */}
        <Card className="bg-card border-border shadow-sm rounded-none">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tighter text-foreground"><Upload className="h-5 w-5 text-primary" /> Upload Document</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">Upload a local Markdown, PDF, or text file.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="category" className="text-xs font-bold text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={(val) => setCategory(val || "fighters")}>
                  <SelectTrigger id="category" className="bg-background border-border text-foreground h-12 rounded-none focus:ring-primary">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border text-foreground rounded-none">
                    <SelectItem value="fighters" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">Fighters</SelectItem>
                    <SelectItem value="events" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">Events</SelectItem>
                    <SelectItem value="history" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">History</SelectItem>
                    <SelectItem value="rules" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">Rules</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="file" className="text-xs font-bold text-muted-foreground">File</Label>
                <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required className="bg-background border-border text-foreground h-12 focus-visible:ring-primary rounded-none file:text-primary file:font-bold file: file:" />
              </div>
              <Button type="submit" disabled={!file || uploading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 font-bold rounded-none">
                {uploading ? "Uploading..." : "Upload & Process"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Scrape Card */}
        <Card className="bg-card border-border shadow-sm rounded-none">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tighter text-foreground"><Globe className="h-5 w-5 text-primary" /> Web Scraper</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">Scrape knowledge from Wikipedia, ufc.com, or ufcstats.com.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleScrape} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="scrapeCategory" className="text-xs font-bold text-muted-foreground">Category</Label>
                <Select name="scrapeCategory" defaultValue={category} onValueChange={(val) => setCategory(val || "fighters")}>
                  <SelectTrigger id="scrapeCategory" className="bg-background border-border text-foreground h-12 rounded-none focus:ring-primary">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border text-foreground rounded-none">
                    <SelectItem value="fighters" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">Fighters</SelectItem>
                    <SelectItem value="events" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">Events</SelectItem>
                    <SelectItem value="history" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">History</SelectItem>
                    <SelectItem value="rules" className="focus:bg-primary focus:text-primary-foreground rounded-none cursor-pointer">Rules</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="url" className="text-xs font-bold text-muted-foreground">URL / Topic</Label>
                <Input id="url" name="url" defaultValue="" placeholder="https://ufcstats.com/... or Topic Name" required className="bg-background border-border text-foreground h-12 focus-visible:ring-primary rounded-none placeholder:text-muted-foreground" />
              </div>

              {scrapeStatus ? (
                <div className="p-4 bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Status</span>
                    <span className="text-xs font-bold text-primary animate-pulse">{scrapeStatus}</span>
                  </div>
                </div>
              ) : (
                <Button type="submit" className="w-full bg-foreground text-background hover:bg-muted-foreground h-12 font-bold rounded-none">Scrape & Process</Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ingested Documents</CardTitle>
            <CardDescription>Vectorized chunks ready for RAG and Quiz generation.</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => loadDocuments()} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-none border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date Ingested</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-4 w-48 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Database className="h-10 w-10 text-muted-foreground/30" />
                        <p className="font-medium text-base">No documents ingested yet.</p>
                        <p className="text-sm">Seed or upload some data to get started!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{doc.category}</Badge>
                      </TableCell>
                      <TableCell className="truncate max-w-[200px] text-muted-foreground" title={doc.source}>
                        {doc.source.startsWith("http") ? <a href={doc.source} target="_blank" rel="noreferrer" className="hover:underline text-blue-400">Link</a> : doc.source}
                      </TableCell>
                      <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
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
                        }} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          {deletingId === doc.id ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                <div className="text-sm text-muted-foreground">
                  Showing page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span> ({totalDocuments} total documents)
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                    className="h-8 w-8 p-0 rounded-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isFetching}
                    className="h-8 w-8 p-0 rounded-none"
                  >
                    <ChevronRight className="h-4 w-4" />
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
