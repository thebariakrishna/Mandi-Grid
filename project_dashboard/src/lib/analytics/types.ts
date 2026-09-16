export type FilterObject = {
  state?: string | null;
  district?: string | null;
  mandi?: string | null;
  crop?: string | null;
  variety?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  days?: number | null;
};

export type StructuredResult = {
  success: boolean;
  questionType: string;
  metric: string;
  title: string;
  scope: FilterObject;
  result: Record<string, any>;
  sampleSize: number;
  unit?: string;
  source: string;
  calculationNote?: string;
  chart?: {
    chartType: "bar" | "line" | "pie" | "area";
    title: string;
    unit: string;
    data: Array<{ name: string; value: number; [key: string]: any }>;
    xAxis: string;
    yAxis: string;
  };
};
