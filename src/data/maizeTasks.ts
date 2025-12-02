import { DayTask, Task } from "@/types/farm";

// Convert DayTask format to individual Task format
const dayTasks: DayTask[] = [
  {
    day: 1,
    stage: "Land Preparation",
    tasks: [
      "Clear the field of weeds and debris",
      "Plow the land to 20-25cm depth",
      "Test soil pH (should be 5.5-7.0)"
    ],
    completed: false
  },
  {
    day: 5,
    stage: "Soil Preparation",
    tasks: [
      "Apply organic manure (10-15 tons per hectare)",
      "Create planting rows 75cm apart",
      "Ensure good drainage system"
    ],
    completed: false
  },
  {
    day: 10,
    stage: "Planting",
    tasks: [
      "Plant seeds 25cm apart within rows",
      "Plant 2-3 seeds per hole at 5cm depth",
      "Apply basal fertilizer (NPK 15:15:15)"
    ],
    completed: false
  },
  {
    day: 15,
    stage: "Germination",
    tasks: [
      "Monitor seed emergence (7-10 days)",
      "Check for proper spacing",
      "Replant any missing hills"
    ],
    completed: false
  },
  {
    day: 20,
    stage: "Thinning",
    tasks: [
      "Thin to one healthy plant per hill",
      "Apply first weeding",
      "Check for cutworms and armyworms"
    ],
    completed: false
  },
  {
    day: 30,
    stage: "Early Growth",
    tasks: [
      "Apply first top dressing (urea at 100kg/ha)",
      "Second weeding session",
      "Monitor for leaf blight and rust"
    ],
    completed: false
  },
  {
    day: 45,
    stage: "Vegetative Growth",
    tasks: [
      "Apply second top dressing (urea)",
      "Check for stem borers",
      "Ensure adequate water supply"
    ],
    completed: false
  },
  {
    day: 60,
    stage: "Knee-High Stage",
    tasks: [
      "Monitor for fall armyworm",
      "Check nitrogen deficiency (yellowing leaves)",
      "Apply foliar fertilizer if needed"
    ],
    completed: false
  },
  {
    day: 70,
    stage: "Pre-Tasseling",
    tasks: [
      "Scout for pests daily",
      "Ensure consistent moisture",
      "Remove any diseased plants"
    ],
    completed: false
  },
  {
    day: 80,
    stage: "Tasseling",
    tasks: [
      "Monitor for adequate pollination",
      "Check for corn smut",
      "Control aphids if present"
    ],
    completed: false
  },
  {
    day: 85,
    stage: "Silking",
    tasks: [
      "Ensure good pollination conditions",
      "Monitor for poor kernel set",
      "Check silk for pests"
    ],
    completed: false
  },
  {
    day: 95,
    stage: "Grain Fill",
    tasks: [
      "Monitor for ear rot",
      "Check for bird damage",
      "Assess grain development"
    ],
    completed: false
  },
  {
    day: 105,
    stage: "Dough Stage",
    tasks: [
      "Reduce irrigation frequency",
      "Monitor for storage pests",
      "Plan harvest logistics"
    ],
    completed: false
  },
  {
    day: 115,
    stage: "Maturity",
    tasks: [
      "Check grain moisture (should be <25%)",
      "Look for black layer at kernel base",
      "Prepare harvesting equipment"
    ],
    completed: false
  },
  {
    day: 120,
    stage: "Harvest",
    tasks: [
      "Harvest when moisture is 20-25%",
      "Dry to 13-14% moisture for storage",
      "Store in clean, dry, ventilated space"
    ],
    completed: false
  }
];

// Convert to individual Task format for new authentication-based system
export const maizeTasks: Task[] = dayTasks.flatMap((dayTask) =>
  dayTask.tasks.map((taskStr, index) => ({
    id: `day${dayTask.day}-task${index}`,
    day: dayTask.day,
    title: taskStr,
    description: `${dayTask.stage} - Day ${dayTask.day}`,
    stage: dayTask.stage,
  }))
);

// Export the original format for backward compatibility
export const dayTasksData = dayTasks;
