"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { parseKML } from "@/lib/utils/kmlParser";
import { importKMLData } from "@/app/actions/importActions";

export function ImportKmlButton({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const parsedGroups = parseKML(text);

      if (parsedGroups.length === 0) {
        alert("No valid geometries found in the KML file.");
        setIsImporting(false);
        return;
      }

      const result = await importKMLData(projectId, parsedGroups);

      if (result.error) {
        alert("Failed to import KML: " + result.error);
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      alert("Error parsing or importing KML file.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        accept=".kml"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:border-indigo-200"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        title="Import Google MyMaps KML"
      >
        {isImporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{isImporting ? "Importing..." : "Import KML"}</span>
      </Button>
    </>
  );
}
