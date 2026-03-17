// GDU (Growing Degree Units) calculation utilities for maize

export const BASE_TEMP = 10; // Base temperature for maize in Celsius
export const MAX_TEMP_CAP = 30; // Maximum temperature cap

/**
 * Calculate GDU for a single day
 * Formula: GDU = ((Tmax + Tmin) / 2) - Base
 * With caps: Tmax capped at 30°C, if result < 0 then GDU = 0
 */
export const calculateDailyGDU = (tempMax: number, tempMin: number): number => {
  const cappedMax = Math.min(tempMax, MAX_TEMP_CAP);
  const avgTemp = (cappedMax + tempMin) / 2;
  const gdu = avgTemp - BASE_TEMP;
  return Math.max(0, gdu);
};

// GDU thresholds for each growth stage
export const GDU_STAGES = [
  { stage: "VE", name: "Emergence", minGdu: 0, maxGdu: 100, description: "Seed germination and emergence" },
  { stage: "V2", name: "Two Leaves", minGdu: 100, maxGdu: 200, description: "Second leaf collar visible" },
  { stage: "V4", name: "Four Leaves", minGdu: 200, maxGdu: 350, description: "Fourth leaf collar visible" },
  { stage: "V6", name: "Six Leaves", minGdu: 350, maxGdu: 475, description: "Growing point above soil" },
  { stage: "V8", name: "Eight Leaves", minGdu: 475, maxGdu: 610, description: "Rapid growth begins" },
  { stage: "V10", name: "Ten Leaves", minGdu: 610, maxGdu: 740, description: "Ear shoot development" },
  { stage: "V12", name: "Twelve Leaves", minGdu: 740, maxGdu: 870, description: "Tassel development" },
  { stage: "V14", name: "Fourteen Leaves", minGdu: 870, maxGdu: 1000, description: "Ear size determination" },
  { stage: "VT", name: "Tasseling", minGdu: 1000, maxGdu: 1135, description: "Tassel fully emerged" },
  { stage: "R1", name: "Silking", minGdu: 1135, maxGdu: 1400, description: "Silks visible, pollination" },
  { stage: "R2", name: "Blister", minGdu: 1400, maxGdu: 1660, description: "Kernels white, blister-like" },
  { stage: "R3", name: "Milk", minGdu: 1660, maxGdu: 1925, description: "Kernels yellow, milky fluid" },
  { stage: "R4", name: "Dough", minGdu: 1925, maxGdu: 2190, description: "Starch accumulation" },
  { stage: "R5", name: "Dent", minGdu: 2190, maxGdu: 2450, description: "Kernels denting" },
  { stage: "R6", name: "Maturity", minGdu: 2450, maxGdu: 99999, description: "Black layer formed, ready for harvest" },
] as const;

export type GrowthStage = typeof GDU_STAGES[number];

/**
 * Get current growth stage based on accumulated GDU
 */
export const getGrowthStage = (accumulatedGdu: number): GrowthStage => {
  for (let i = GDU_STAGES.length - 1; i >= 0; i--) {
    if (accumulatedGdu >= GDU_STAGES[i].minGdu) {
      return GDU_STAGES[i];
    }
  }
  return GDU_STAGES[0];
};

/**
 * Get next growth stage
 */
export const getNextStage = (accumulatedGdu: number): GrowthStage | null => {
  const currentStage = getGrowthStage(accumulatedGdu);
  const currentIndex = GDU_STAGES.findIndex(s => s.stage === currentStage.stage);
  if (currentIndex < GDU_STAGES.length - 1) {
    return GDU_STAGES[currentIndex + 1];
  }
  return null;
};

/**
 * Calculate progress to next stage (0-100%)
 */
export const getStageProgress = (accumulatedGdu: number): number => {
  const currentStage = getGrowthStage(accumulatedGdu);
  const range = currentStage.maxGdu - currentStage.minGdu;
  const progress = accumulatedGdu - currentStage.minGdu;
  return Math.min(100, Math.max(0, (progress / range) * 100));
};

/**
 * Calculate days since planting
 */
export const getDaysSincePlanting = (plantingDate: Date | string): number => {
  const planting = new Date(plantingDate);
  const today = new Date();
  const diffTime = today.getTime() - planting.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get tasks for current GDU stage
 */
export const getTasksForStage = (stage: string): string[] => {
  const tasksByStage: Record<string, string[]> = {
    VE: [
      "Monitor seed emergence (should occur within 7-10 days)",
      "Check for proper spacing",
      "Scout for early pests like cutworms"
    ],
    V2: [
      "First scouting for seedling diseases",
      "Check plant stand uniformity",
      "Plan first fertilizer application"
    ],
    V4: [
      "Apply first side-dress nitrogen if needed",
      "Scout for early leaf diseases",
      "Monitor soil moisture levels"
    ],
    V6: [
      "Critical weed control period begins",
      "Apply post-emergence herbicides if needed",
      "Scout for armyworms and corn borers"
    ],
    V8: [
      "Continue pest monitoring",
      "Second nitrogen application if split application",
      "Evaluate crop health and uniformity"
    ],
    V10: [
      "Monitor for fall armyworm",
      "Scout for nutrient deficiencies",
      "Ear shoot development - protect from stress"
    ],
    V12: [
      "Final nitrogen application window closing",
      "Scout for foliar diseases",
      "Monitor irrigation needs"
    ],
    V14: [
      "Critical water period - ensure adequate moisture",
      "Scout for ear development issues",
      "Monitor for gray leaf spot"
    ],
    VT: [
      "Maximum water usage period",
      "Scout for corn smut",
      "Avoid any field stress"
    ],
    R1: [
      "Ensure good pollination conditions",
      "Control silk-feeding insects",
      "Maintain consistent moisture"
    ],
    R2: [
      "Monitor kernel development",
      "Scout for ear rots",
      "Continue irrigation if needed"
    ],
    R3: [
      "Grain fill stage - maintain nutrition",
      "Monitor for diseases on ears",
      "Begin harvest planning"
    ],
    R4: [
      "Starch accumulation stage",
      "Reduce irrigation frequency",
      "Scout for storage pests"
    ],
    R5: [
      "Kernels denting - approaching maturity",
      "Check grain moisture regularly",
      "Finalize harvest logistics"
    ],
    R6: [
      "Black layer formed - physiological maturity",
      "Harvest when moisture is 20-25%",
      "Dry grain to 13-14% for safe storage"
    ]
  };
  return tasksByStage[stage] || [];
};