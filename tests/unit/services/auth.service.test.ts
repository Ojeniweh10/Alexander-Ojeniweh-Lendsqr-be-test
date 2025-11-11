import { AuthService } from "@/services/auth.service";
import { UserRepository } from "@/repositories/user.repository";
import { WalletRepository } from "@/repositories/wallet.repository";
import { AdjutorService } from "@/services/adjutor.service";
import { AppError } from "@/types";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/config/database";

jest.mock("@/repositories/user.repository");
jest.mock("@/repositories/wallet.repository");
jest.mock("@/services/adjutor.service");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("@/config/database", () => ({
  db: {
    transaction: jest.fn(),
  },
}));

describe("AuthService", () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockWalletRepo: jest.Mocked<WalletRepository>;
  let mockAdjutorService: jest.Mocked<AdjutorService>;
  let mockTrx: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup transaction mock
    mockTrx = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    (db.transaction as jest.Mock).mockResolvedValue(mockTrx);

    // Create service instance
    authService = new AuthService();

    // Get mocked instances
    mockUserRepo = (authService as any).userRepo;
    mockWalletRepo = (authService as any).walletRepo;
    mockAdjutorService = (authService as any).adjutorService;
  });

  describe("register", () => {
    const validUserData = {
      email: "test@ng.com",
      password: "password123",
      phone_number: "+2348012345678",
      first_name: "John",
      last_name: "Doe",
      bvn: "12345678901",
      bvn_phone_number: "+2348012345678",
      dob: "1990-01-01",
      account_number: "1234567890",
      bank_code: "011",
      state: "Lagos",
      city: "Ikeja",
      address: "123 Street",
      photo_url: "https://example.com/photo.jpg",
      documents: [{ url: "https://doc.com/id.jpg", type_id: 1 }],
    };

    const mockUser = {
      id: 1,
      email: "test@ng.com",
      phone_number: "+2348012345678",
      first_name: "John",
      last_name: "Doe",
      password_hash: "hashedpassword",
      bvn: "12345678901",
      bvn_phone_number: "+2348012345678",
      dob: new Date("1990-01-01"),
      address: "123 Street",
      city: "Ikeja",
      state: "Lagos",
      account_number: "1234567890",
      bank_code: "011",
      is_blacklisted: false,
      adjutor_customer_id: 100,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockWallet = {
      id: 1,
      user_id: 1,
      balance: 0,
      currency: "NGN",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it("should register user successfully", async () => {
      mockUserRepo.emailExists.mockResolvedValue(false);
      mockUserRepo.phoneNumberExists.mockResolvedValue(false);
      mockUserRepo.accountNumberExists.mockResolvedValue(false);

      mockAdjutorService.validateCustomerData.mockReturnValue(undefined);
      mockAdjutorService.createCustomerAndCheckBlacklist.mockResolvedValue({
        data: { user: { id: 100, blacklisted: 0 } },
      } as any);

      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedpassword");
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockWalletRepo.create.mockResolvedValue(mockWallet);
      (jwt.sign as jest.Mock).mockReturnValue("mock-jwt-token");

      const result = await authService.register(validUserData);

      expect(mockUserRepo.emailExists).toHaveBeenCalledWith(
        validUserData.email
      );
      expect(mockUserRepo.phoneNumberExists).toHaveBeenCalledWith(
        validUserData.phone_number
      );
      expect(mockUserRepo.accountNumberExists).toHaveBeenCalledWith(
        validUserData.account_number
      );
      expect(
        mockAdjutorService.createCustomerAndCheckBlacklist
      ).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(validUserData.password, 10);
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validUserData.email,
          phone_number: validUserData.phone_number,
          first_name: validUserData.first_name,
          last_name: validUserData.last_name,
        }),
        mockTrx
      );
      expect(mockWalletRepo.create).toHaveBeenCalledWith(mockUser.id, mockTrx);
      expect(mockTrx.commit).toHaveBeenCalled();
      expect(result.user.email).toBe("test@ng.com");
      expect(result.user).not.toHaveProperty("password_hash");
      expect(result.wallet).toEqual(mockWallet);
      expect(result.token).toBe("mock-jwt-token");
    });

    it("should throw error if email already exists", async () => {
      mockUserRepo.emailExists.mockResolvedValue(true);
      mockUserRepo.phoneNumberExists.mockResolvedValue(false);
      mockUserRepo.accountNumberExists.mockResolvedValue(false);

      await expect(authService.register(validUserData)).rejects.toThrow(
        new AppError(409, "Email already registered")
      );

      expect(
        mockAdjutorService.createCustomerAndCheckBlacklist
      ).not.toHaveBeenCalled();
    });

    it("should throw error if phone number already exists", async () => {
      mockUserRepo.emailExists.mockResolvedValue(false);
      mockUserRepo.phoneNumberExists.mockResolvedValue(true);
      mockUserRepo.accountNumberExists.mockResolvedValue(false);

      await expect(authService.register(validUserData)).rejects.toThrow(
        new AppError(409, "Phone number already registered")
      );
    });

    it("should throw error if account number already exists", async () => {
      mockUserRepo.emailExists.mockResolvedValue(false);
      mockUserRepo.phoneNumberExists.mockResolvedValue(false);
      mockUserRepo.accountNumberExists.mockResolvedValue(true);

      await expect(authService.register(validUserData)).rejects.toThrow(
        new AppError(409, "Account number already registered")
      );
    });

    it("should throw error if user is blacklisted", async () => {
      mockUserRepo.emailExists.mockResolvedValue(false);
      mockUserRepo.phoneNumberExists.mockResolvedValue(false);
      mockUserRepo.accountNumberExists.mockResolvedValue(false);

      mockAdjutorService.validateCustomerData.mockReturnValue(undefined);
      mockAdjutorService.createCustomerAndCheckBlacklist.mockResolvedValue({
        data: {
          user: {
            id: 100,
            blacklisted: 1,
            reason: "Fraudulent activity",
          },
        },
      } as any);

      await expect(authService.register(validUserData)).rejects.toThrow(
        new AppError(
          403,
          "Registration denied. Please contact support for more information."
        )
      );

      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it("should rollback transaction on error", async () => {
      mockUserRepo.emailExists.mockResolvedValue(false);
      mockUserRepo.phoneNumberExists.mockResolvedValue(false);
      mockUserRepo.accountNumberExists.mockResolvedValue(false);

      mockAdjutorService.validateCustomerData.mockReturnValue(undefined);
      mockAdjutorService.createCustomerAndCheckBlacklist.mockResolvedValue({
        data: { user: { id: 100, blacklisted: 0 } },
      } as any);

      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedpassword");
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockWalletRepo.create.mockRejectedValue(new Error("Database error"));

      await expect(authService.register(validUserData)).rejects.toThrow();

      expect(mockTrx.rollback).toHaveBeenCalled();
      expect(mockTrx.commit).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    const loginData = {
      email: "test@ng.com",
      password: "password123",
    };

    const mockUser = {
      id: 1,
      email: "test@ng.com",
      password_hash: "hashedpassword",
      is_active: true,
      is_blacklisted: false,
      first_name: "John",
      last_name: "Doe",
    };

    const mockWallet = {
      id: 1,
      user_id: 1,
      balance: 5000,
      currency: "NGN",
      is_active: true,
    };

    it("should login user successfully", async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockWalletRepo.findByUserId.mockResolvedValue(mockWallet as any);
      (jwt.sign as jest.Mock).mockReturnValue("mock-jwt-token");

      const result = await authService.login(loginData);

      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginData.password,
        mockUser.password_hash
      );
      expect(mockWalletRepo.findByUserId).toHaveBeenCalledWith(mockUser.id);
      expect(result.user).not.toHaveProperty("password_hash");
      expect(result.wallet).toEqual(mockWallet);
      expect(result.token).toBe("mock-jwt-token");
    });

    it("should throw error if user not found", async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow(
        new AppError(401, "Invalid email or password")
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it("should throw error if password is invalid", async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow(
        new AppError(401, "Invalid email or password")
      );

      expect(mockWalletRepo.findByUserId).not.toHaveBeenCalled();
    });

    it("should throw error if user is inactive", async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        is_active: false,
      } as any);

      await expect(authService.login(loginData)).rejects.toThrow(
        new AppError(403, "Account is inactive. Please contact support.")
      );
    });

    it("should throw error if user is blacklisted", async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        ...mockUser,
        is_blacklisted: true,
      } as any);

      await expect(authService.login(loginData)).rejects.toThrow(
        new AppError(403, "Account access denied. Please contact support.")
      );
    });
  });

  describe("verifyToken", () => {
    it("should verify valid token", () => {
      const mockDecoded = { userId: 1, email: "test@ng.com" };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      const result = authService.verifyToken("valid-token");

      expect(jwt.verify).toHaveBeenCalledWith(
        "valid-token",
        expect.any(String)
      );
      expect(result).toEqual(mockDecoded);
    });

    it("should throw error for invalid token", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      expect(() => authService.verifyToken("invalid-token")).toThrow(
        new AppError(401, "Invalid or expired token")
      );
    });
  });
});
