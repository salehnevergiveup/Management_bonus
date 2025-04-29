export interface TransferAccount {
    id: string;
    username: string;
    password: string;
    pin_code: string;
    type: string;
    parent_id: string | null;
    parent?: TransferAccount | null;
    status?: string;
    progress?: number | null;
    created_at: Date;
    updated_at: Date;
    process_id: string | null;
  }
  
export interface Match {
    id: string;
    transfer_account_id: string;
    amount: number;
    currency: string;
    username: string;
    process_id: string;
    status?: string;
  }
  
export interface Transfer {
    account: string;
    amount: number;
    status?: string;  
    id?: string,
    username?: string,  
    password?: string
  }
  
export interface Wallet {
    currency: string;
    transfers: Transfer[];
  }
  
export interface Account {
    username: string;
    password: string;
    pin_code: string;
    wallets: Wallet[];
  }
  
export interface ResumeResult {
    process_id: string;
    main_accounts: Account[];
    sub_accounts: Account[];
  }