import { UserRepository } from './user.repository';
import { WalletRepository } from './wallet.repository';
import { TransactionRepository } from './transaction.repository';

export const userRepo = new UserRepository();
export const walletRepo = new WalletRepository();
export const transactionRepo = new TransactionRepository();