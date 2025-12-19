
export interface Student {
  id: string;
  name: string;
  isPresent: boolean;
}

export interface AnalysisResult {
  personCount: number;
  confidence: number;
  description: string;
  detectedFeatures: string[];
}

export interface AttendanceReport {
  id: string;
  timestamp: number;
  dateString: string;
  courseName: string;
  className: string;
  expectedCount: number;
  actualCount: number;
  absentCount: number;
  absentNames: string[];
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  HISTORY = 'HISTORY'
}
