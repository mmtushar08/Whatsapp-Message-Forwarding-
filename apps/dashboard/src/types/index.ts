export interface MessageLog {
  id: number;
  from_number: string;
  to_number: string;
  message: string;
  type: string;
  status: 'success' | 'failed';
  error: string | null;
  forwarded_at: string;
}

export interface MessageStats {
  total: number;
  success: number;
  failed: number;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface MessagesResponse {
  data: MessageLog[];
  pagination: Pagination;
}
