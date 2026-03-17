import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { maizeTasks } from "@/data/maizeTasks";

interface DayCompletion {
  day: number;
  completedCount: number;
  totalCount: number;
}

interface ExportData {
  userName: string;
  farmLocation?: string;
  farmSize?: string;
  currentDay: number;
  completions: DayCompletion[];
  startDate: string;
}

export const exportToCSV = (data: ExportData) => {
  const headers = ["Day", "Stage", "Tasks", "Completed", "Total", "Status"];
  
  const rows = data.completions.map((day) => {
    const stage = maizeTasks.find((t) => t.day === day.day)?.stage || "";
    const tasks = maizeTasks
      .filter((t) => t.day === day.day)
      .map((t) => t.title)
      .join("; ");
    const status =
      day.totalCount === 0
        ? "No tasks"
        : day.completedCount === day.totalCount
        ? "Complete"
        : day.completedCount > 0
        ? "In Progress"
        : "Not Started";
    
    return [day.day, stage, tasks, day.completedCount, day.totalCount, status];
  });

  const csvContent = [
    `Maize Farming Progress Report`,
    `Farmer: ${data.userName}`,
    `Farm Location: ${data.farmLocation || "N/A"}`,
    `Farm Size: ${data.farmSize || "N/A"}`,
    `Start Date: ${data.startDate}`,
    `Current Day: ${data.currentDay}`,
    ``,
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `farming-progress-${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (data: ExportData) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(34, 139, 34);
  doc.text("Maize Farming Progress Report", 105, 20, { align: "center" });
  
  // Farm Info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Farmer: ${data.userName}`, 14, 35);
  doc.text(`Farm Location: ${data.farmLocation || "N/A"}`, 14, 42);
  doc.text(`Farm Size: ${data.farmSize || "N/A"}`, 14, 49);
  doc.text(`Start Date: ${data.startDate}`, 14, 56);
  doc.text(`Current Day: ${data.currentDay} of 120`, 14, 63);
  
  // Progress Summary
  const completedDays = data.completions.filter(
    (d) => d.totalCount > 0 && d.completedCount === d.totalCount
  ).length;
  const totalDaysWithTasks = data.completions.filter((d) => d.totalCount > 0).length;
  
  doc.setFontSize(14);
  doc.text("Progress Summary", 14, 75);
  doc.setFontSize(11);
  doc.text(`Days Completed: ${completedDays} / ${totalDaysWithTasks}`, 14, 83);
  doc.text(`Overall Progress: ${Math.round((completedDays / totalDaysWithTasks) * 100)}%`, 14, 90);
  
  // Table Data
  const tableData = data.completions
    .filter((d) => d.totalCount > 0)
    .map((day) => {
      const stage = maizeTasks.find((t) => t.day === day.day)?.stage || "";
      const status =
        day.completedCount === day.totalCount
          ? "✓ Complete"
          : day.completedCount > 0
          ? "In Progress"
          : "Not Started";
      
      return [
        `Day ${day.day}`,
        stage,
        `${day.completedCount}/${day.totalCount}`,
        status,
      ];
    });

  autoTable(doc, {
    startY: 100,
    head: [["Day", "Stage", "Tasks", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [34, 139, 34] },
    alternateRowStyles: { fillColor: [240, 248, 240] },
  });

  doc.save(`farming-progress-${new Date().toISOString().split("T")[0]}.pdf`);
};
