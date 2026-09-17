export interface Location {
  id: number;
  name: string;
  floor?: string | null;
}

export interface Contractor {
  id: number;
  name: string;
  trade: string;
  phone?: string | null;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  locations: Location[];
  contractors: Contractor[];
}

export interface Snag {
  id: number;
  title: string;
  description?: string | null;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed' | string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  location?: string | null;
  contractor?: string | null;
  contractor_trade?: string | null;
  created_at?: string | null;
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: 'Pending' | 'In Progress' | 'Completed' | string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  location?: string | null;
  contractor?: string | null;
  contractor_trade?: string | null;
  created_at?: string | null;
}

export interface HealthResponse {
  status: string;
  groq_configured: boolean;
}

export interface SnagConfirmationPayload {
  intent: 'create_snag';
  title: string;
  location_id?: number | null;
  location_name?: string | null;
  contractor_id?: number | null;
  contractor_name?: string | null;
  contractor_trade?: string | null;
  priority: string;
  description?: string;
  raw_location?: string | null;
  raw_contractor?: string | null;
}

export interface TaskConfirmationPayload {
  intent: 'assign_task';
  title: string;
  location_id?: number | null;
  location_name?: string | null;
  contractor_id?: number | null;
  contractor_name?: string | null;
  contractor_trade?: string | null;
  due_date?: string | null;
  priority: string;
  description?: string;
  raw_location?: string | null;
  raw_contractor?: string | null;
}

export interface SearchResultsResponse {
  type: 'search_results';
  intent: 'search_records';
  record_type: 'snag' | 'task';
  count: number;
  filters: {
    location?: string | null;
    contractor?: string | null;
    status?: string | null;
  };
  snags?: Snag[];
  tasks?: Task[];
  transcript?: string;
}

export interface ClarifyResponse {
  type: 'clarify';
  message: string;
  intent?: string;
  missing_fields?: string[];
  data?: any;
}

export interface ConfirmResponse {
  type: 'confirm';
  message: string;
  intent: 'create_snag' | 'assign_task';
  data: SnagConfirmationPayload | TaskConfirmationPayload;
  transcript?: string;
}

export interface UnknownResponse {
  type: 'unknown' | 'error';
  message: string;
  transcript?: string;
}

export type VoiceResponse = ConfirmResponse | SearchResultsResponse | ClarifyResponse | UnknownResponse;

export interface ConfirmResult {
  type: 'created' | 'cancelled';
  intent?: string;
  message: string;
  snag?: Snag;
  task?: Task;
}
