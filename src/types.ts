export interface SocialTask {
  id: string;
  platform: 'Instagram' | 'Twitter' | 'TikTok' | 'YouTube' | 'WhatsApp' | 'Website';
  type: 'Follow' | 'Like' | 'Retweet' | 'Post' | 'Subscribe' | 'Comment' | 'View Website';
  description: string;
  payout: number;
  url: string;
  status: 'available' | 'submitted' | 'approved' | 'rejected';
  slotsLeft: number;
  platformIcon: string;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  price: number;
  category: string;
  image: string;
  contact: string;
  description: string;
  seller: string;
}

export interface WalletTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'earn' | 'deposit' | 'withdraw' | 'advert_buy' | 'marketplace_buy' | 'upgrade';
  date: string;
  status: 'successful' | 'pending' | 'failed';
  userId?: string;
}

export interface BankAccount {
  accountNumber: string;
  bankName: string;
  accountName: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

