import { Request } from "express";

// User Types
export interface User {
  id: number;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  bvn: string;
  bvn_phone_number: string;
  dob: Date;
  address: string;
  city: string;
  state: string;
  account_number: string;
  bank_code: string;
  is_blacklisted: boolean;
  blacklist_reason?: string;
  adjutor_customer_id?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDTO {
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  password: string;
  bvn: string;
  bvn_phone_number: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  account_number: string;
  bank_code: string;
  photo_url: string;
  documents: AdjutorDocument[];
}

// Wallet Types
export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Transaction Types
export enum TransactionType {
  CREDIT = "credit",
  DEBIT = "debit",
}

export enum TransactionCategory {
  FUNDING = "funding",
  TRANSFER = "transfer",
  WITHDRAWAL = "withdrawal",
}

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

export interface Transaction {
  id: number;
  reference: string;
  wallet_id: number;
  transaction_type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  category: TransactionCategory;
  related_wallet_id?: number;
  status: TransactionStatus;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTransactionDTO {
  wallet_id: number;
  transaction_type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  category: TransactionCategory;
  related_wallet_id?: number;
  metadata?: any;
}

// Adjutor API Types
export interface AdjutorDocument {
  url: string;
  type_id: number;
  sub_type_id?: number;
}

export interface AdjutorCustomerRequest {
  phone_number: string;
  bvn: string;
  bvn_phone_number: string;
  dob: any;
  email: string;
  account_number: string;
  bank_code: string;
  state: string;
  lga?: string;
  city: string;
  address: string;
  photo_url: string;
  documents: AdjutorDocument[];
}

export interface AdjutorCustomerResponse {
  id: number;
  org_id: number;
  manager_id: number | null;
  office_id: number | null;
  first_name: string;
  last_name: string;
  phone_number: string;
  country: string;
  language: string;
  locale: string;
  timezone: string | null;
  email: string;
  email_verified: 0 | 1;
  id_document_id: number | null;
  dob: string;
  photo_url: string;
  address: string | null;
  city: string | null;
  gender: string;
  marital_status: number | null;
  credit_score: number | null;
  activated: 0 | 1;
  activated_on: string | null;
  blacklisted: 0 | 1;
  reason: string | null;
  created_on: string;
}

// Response when creating a customer
export interface AdjutorCreateCustomerResponse {
  status: string;
  message: string;
  data: {
    user: AdjutorCustomerResponse;
  };
  meta: {
    cost: number;
    balance: number;
  };
}

export interface AuthRequest extends Request {
  headers: {
    authorization: string;
  };
  user: {
    userId: number;
    email: string;
  };
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface FundWalletDTO {
  amount: number;
}

export interface TransferDTO {
  recipient_account_number: string;
  amount: number;
  description?: string;
}

export interface WithdrawDTO {
  amount: number;
  description?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Types
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
