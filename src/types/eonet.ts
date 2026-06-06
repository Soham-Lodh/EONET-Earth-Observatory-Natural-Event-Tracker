export interface EventPoint {
  date: string;
  coordinates: [number, number];
  magnitudeValue: number;
}

export interface DisasterEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  magnitudeUnit: string;
  magnitudeValue: number;
  closed: string | null;
  startDate: string;
  endDate: string;
  points: EventPoint[];
}