import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/exportData";

interface DayCompletion {
  day: number;
  completedCount: number;
  totalCount: number;
}

interface ExportButtonProps {
  userName: string;
  farmLocation?: string;
  farmSize?: string;
  currentDay: number;
  completions: DayCompletion[];
  startDate: string;
}

export const ExportButton = ({
  userName,
  farmLocation,
  farmSize,
  currentDay,
  completions,
  startDate,
}: ExportButtonProps) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "pdf" | "csv") => {
    setExporting(true);
    const data = {
      userName,
      farmLocation,
      farmSize,
      currentDay,
      completions,
      startDate,
    };

    try {
      if (format === "pdf") {
        exportToPDF(data);
      } else {
        exportToCSV(data);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="mr-2 h-4 w-4" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Download CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
