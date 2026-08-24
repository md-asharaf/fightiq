"use client";

import { useEffect, useState } from "react";
import { Upload, Database, Globe, RefreshCcw } from "lucide-react";
import { fetchApi, uploadFile } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("fighters");
  const [scrapeUrl, setScrapeUrl] = useState("");

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/documents");
      setDocuments(data);
    } catch (error) {
      console.error("Failed to load documents", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await fetchApi("/ingest/seed", { method: "POST" });
      await loadDocuments();
      alert("Seed completed successfully!");
    } catch (error: any) {
      alert("Failed to seed: " + error.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      await uploadFile("/ingest/file", file, { category });
      setFile(null);
      await loadDocuments();
      alert("File uploaded successfully!");
    } catch (error: any) {
      alert("Upload failed: " + error.message);
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeUrl) return;

    try {
      await fetchApi("/ingest/scrape", {
        method: "POST",
        body: JSON.stringify({ url: scrapeUrl, category }),
      });
      setScrapeUrl("");
      await loadDocuments();
      alert("URL scraped successfully!");
    } catch (error: any) {
      alert("Scrape failed: " + error.message);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base Admin</h1>
          <p className="text-muted-foreground">Manage UFC documents, trigger seeding, and run web scrapers.</p>
        </div>
        <Button onClick={handleSeed} disabled={seeding} className="bg-red-600 hover:bg-red-700 text-white">
          {seeding ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          {seeding ? "Seeding Data..." : "Seed Curated Data"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-red-500" /> Upload Document</CardTitle>
            <CardDescription>Upload a local Markdown, PDF, or text file.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(val) => setCategory(val || "fighters")}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fighters">Fighters</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                    <SelectItem value="rules">Rules</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
              </div>
              <Button type="submit" disabled={!file} className="w-full">Upload & Process</Button>
            </form>
          </CardContent>
        </Card>

        {/* Scrape Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-red-500" /> Web Scraper</CardTitle>
            <CardDescription>Scrape knowledge from Wikipedia or other allowed URLs.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScrape} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scrapeCategory">Category</Label>
                <Select value={category} onValueChange={(val) => setCategory(val || "fighters")}>
                  <SelectTrigger id="scrapeCategory">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fighters">Fighters</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                    <SelectItem value="rules">Rules</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input id="url" type="url" placeholder="https://en.wikipedia.org/wiki/..." value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} required />
              </div>
              <Button type="submit" disabled={!scrapeUrl} variant="secondary" className="w-full">Scrape & Process</Button>
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
          <Button variant="outline" size="icon" onClick={loadDocuments} disabled={loading}>
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
