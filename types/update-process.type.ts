interface TransferLine {
  status: string;
  comment: string;
  account: string;
  currency: string;
}

interface AccountBlock {
  name: string;
  account_name: string;
  progress: number;
  status: string;
  stage: string;
  transfer_report: Record<string, TransferLine>;
}

export type ProcessPayload = {
  process_id: string;
} & Record<string, AccountBlock>;

export function isProcessPayload(obj: any): obj is ProcessPayload {
  if (typeof obj !== 'object' || obj === null) return false;

  const record = obj as Record<string, unknown>;
  if (typeof record.process_id !== 'string') return false;

  for (const [key, value] of Object.entries(record)) {
    if (key === 'process_id') continue;

    const acc = value as Partial<AccountBlock>;
    if (
      typeof acc?.name !== 'string' ||
      typeof acc?.account_name !== 'string' ||
      typeof acc?.progress !== 'number' ||
      typeof acc?.status !== 'string' ||
      typeof acc?.stage !== 'string' ||
      typeof acc?.transfer_report !== 'object' ||
      acc.transfer_report === null
    ) {
      return false;
    }

    for (const tr of Object.values(acc.transfer_report)) {
      const t = tr as Partial<TransferLine>;
      if (
        typeof t?.status !== 'string' ||
        typeof t?.comment !== 'string' ||
        typeof t?.account !== 'string' ||
        typeof t?.currency !== 'string'
      ) {
        return false;
      }
    }
  }
  return true;
}


