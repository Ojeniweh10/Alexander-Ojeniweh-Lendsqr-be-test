import { config } from "./../config/enviroment";
import { db } from "../config/database";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import { WalletRepository } from "../repositories/wallet.repository";
import { AdjutorService } from "./adjutor.service";
import {
  CreateUserDTO,
  LoginDTO,
  AppError,
  AdjutorCustomerRequest,
} from "../types";
import logger from "../utils/logger";

export class AuthService {
  private userRepo: UserRepository;
  private walletRepo: WalletRepository;
  private adjutorService: AdjutorService;

  constructor() {
    this.userRepo = new UserRepository();
    this.walletRepo = new WalletRepository();
    this.adjutorService = new AdjutorService();
  }

  /**
   * Register a new user
   * 1. Validate input
   * 2. Check for existing user
   * 3. Verify with Adjutor (check blacklist)
   * 4. Create user and wallet in a transaction
   */
  async register(userData: CreateUserDTO) {
    const [emailExists, phoneExists, accountExists] = await Promise.all([
      this.userRepo.emailExists(userData.email),
      this.userRepo.phoneNumberExists(userData.phone_number),
      this.userRepo.accountNumberExists(userData.account_number),
    ]);

    if (emailExists) {
      throw new AppError(409, "Email already registered");
    }

    if (phoneExists) {
      throw new AppError(409, "Phone number already registered");
    }

    if (accountExists) {
      throw new AppError(409, "Account number already registered");
    }

    const adjutorRequest: AdjutorCustomerRequest = {
      phone_number: userData.phone_number,
      bvn: userData.bvn,
      bvn_phone_number: userData.bvn_phone_number,
      dob: userData.dob,
      email: userData.email,
      account_number: userData.account_number,
      bank_code: userData.bank_code,
      state: userData.state,
      city: userData.city,
      address: userData.address,
      photo_url: userData.photo_url,
      documents: userData.documents,
    };

    this.adjutorService.validateCustomerData(adjutorRequest);

    // Check blacklist status via Adjutor and preventing onboarding if blacklisted
    logger.info("Checking blacklist status for new user", {
      email: userData.email,
    });

    const adjutorResponse =
      await this.adjutorService.createCustomerAndCheckBlacklist(adjutorRequest);

    if (adjutorResponse.data.user.blacklisted === 1) {
      logger.warn("Attempted registration by blacklisted user", {
        email: userData.email,
        reason: adjutorResponse.data.user.reason,
      });
      throw new AppError(
        403,
        "Registration denied. Please contact support for more information."
      );
    }

    const password_hash = await bcrypt.hash(userData.password, 10);

    const trx = await db.transaction();

    try {
      const user = await this.userRepo.create(
        {
          email: userData.email,
          phone_number: userData.phone_number,
          first_name: userData.first_name,
          last_name: userData.last_name,
          password_hash,
          bvn: userData.bvn,
          bvn_phone_number: userData.bvn_phone_number,
          dob: new Date(userData.dob),
          address: userData.address,
          city: userData.city,
          state: userData.state,
          account_number: userData.account_number,
          bank_code: userData.bank_code,
          is_blacklisted: false,
          adjutor_customer_id: adjutorResponse.data.user.id,
          is_active: true,
        },
        trx
      );

      const wallet = await this.walletRepo.create(user.id, trx);
      await trx.commit();

      logger.info("User registered successfully", {
        userId: user.id,
        email: user.email,
        walletId: wallet.id,
      });

      const token = this.generateToken(user.id, user.email);

      const { password_hash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        wallet,
        token,
      };
    } catch (error) {
      await trx.rollback();
      logger.error("Error during user registration", { error });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(loginData: LoginDTO) {
    const user = await this.userRepo.findByEmail(loginData.email);

    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }
    if (!user.is_active) {
      throw new AppError(403, "Account is inactive. Please contact support.");
    }

    if (user.is_blacklisted) {
      throw new AppError(403, "Account access denied. Please contact support.");
    }

    const isPasswordValid = await bcrypt.compare(
      loginData.password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password");
    }

    const wallet = await this.walletRepo.findByUserId(user.id);

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
    });
    const token = this.generateToken(user.id, user.email);

    const { password_hash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      wallet,
      token,
    };
  }

  /**
   * Generate and verify JWT token
   */
  private generateToken(userId: number, email: string): string {
    const payload = { userId, email };
    const options: jwt.SignOptions = {
      expiresIn: config.jwt.expiry as SignOptions["expiresIn"],
    };

    return jwt.sign(payload, config.jwt.secret, options);
  }

  verifyToken(token: string): { userId: number; email: string } {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: number;
        email: string;
      };
      return decoded;
    } catch (error) {
      throw new AppError(401, "Invalid or expired token");
    }
  }
}
