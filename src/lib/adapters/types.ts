import type { CreatorProfile } from '../schema/creator-data';

export interface DataAdapter {
  name: string;
  description: string;
  experimental?: boolean;
  collect(input: string): Promise<CreatorProfile | null>;
}

export type AdapterError = {
  adapter: string;
  code: 'TIMEOUT' | 'PARSE_ERROR' | 'NETWORK_ERROR' | 'BLOCKED' | 'INVALID_URL' | 'UNKNOWN';
  message: string;
};
