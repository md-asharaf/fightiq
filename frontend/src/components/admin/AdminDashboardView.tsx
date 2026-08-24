"use client";

import { useEffect, useState } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function AdminDashboardView() {
  const { documents, loading, uploading, seeding, loadDocuments, seedData, uploadDoc, deleteDoc } = useAdmin();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("fighters");
  const [url, setUrl] = useState("");
  const [scrapeStatus, setScrapeStatus] = useState("");

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleSeed = async () => {
    try {
      await seedData();
      toast.success("Successfully seeded curated data!");
    } catch {
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      await uploadDoc(file, category);
      toast.success("Document uploaded successfully!");
      setFile(null);
    } catch {
      // Errors are handled by the API wrapper
    }
  };

  interface ProgressData {
    topic?: string;
    chunks?: number;
    message?: string;
  }

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setScrapeStatus("Connecting...");

    import("@/lib/api").then(({ streamScrape }) => {
      streamScrape([url], category, {
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
          setUrl("");
          loadDocuments();
        }
      });
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base Admin</h1>
          <p className="text-muted-foreground">Manage UFC documents, trigger seeding, and run web scrapers.</p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            render={<Button disabled={seeding} className="bg-red-600 hover:bg-red-700 text-white" />}
          >
            {seeding ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            {seeding ? "Seeding Data..." : "Seed Curated Data"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will trigger the ingestion pipeline to parse, chunk, and embed all predefined UFC seed files. This might take a minute or two.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSeed} className="bg-red-600 text-white hover:bg-red-700">Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Card */}
        <Card className="bg-card border-border shadow-xl rounded-none">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tighter text-foreground"><Upload className="h-5 w-5 text-primary" /> Upload Document</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">Upload a local Markdown, PDF, or text file.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="category" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</Label>
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
                <Label htmlFor="file" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">File</Label>
                <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required className="bg-background border-border text-foreground h-12 focus-visible:ring-primary rounded-none file:text-primary file:font-bold file:uppercase file:tracking-widest" />
              </div>
              <Button type="submit" disabled={!file || uploading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 font-bold uppercase tracking-wider rounded-none">
                {uploading ? "Uploading..." : "Upload & Process"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Scrape Card */}
        <Card className="bg-card border-border shadow-xl rounded-none">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tighter text-foreground"><Globe className="h-5 w-5 text-primary" /> Web Scraper</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">Scrape knowledge from Wikipedia, ufc.com, or ufcstats.com.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleScrape} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="scrapeCategory" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={(val) => setCategory(val || "fighters")}>
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
                <Label htmlFor="url" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">URL / Topic</Label>
                <Input id="url" placeholder="https://ufcstats.com/... or Topic Name" value={url} onChange={(e) => setUrl(e.target.value)} required className="bg-background border-border text-foreground h-12 focus-visible:ring-primary rounded-none placeholder:text-muted-foreground" />
              </div>

              {scrapeStatus ? (
                <div className="p-4 bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">{scrapeStatus}</span>
                  </div>
                </div>
              ) : (
                <Button type="submit" disabled={!url} className="w-full bg-foreground text-background hover:bg-muted-foreground h-12 font-bold uppercase tracking-wider rounded-none">Scrape & Process</Button>
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
          <Button variant="outline" size="icon" onClick={() => loadDocuments()} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
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
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No documents ingested yet. Seed or upload some data!
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
                        <Button variant="ghost" size="icon" onClick={async () => {
                          try {
                            await deleteDoc(doc.id);
                            toast.success("Document deleted!");
                          } catch { }
                        }} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
