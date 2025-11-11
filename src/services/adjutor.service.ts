import { config } from "./../config/enviroment";
import axios, { AxiosInstance } from "axios";
import {
  AdjutorCustomerRequest,
  AdjutorCreateCustomerResponse,
  AppError,
} from "../types";
import logger from "../utils/logger";

export class AdjutorService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: config.adjutor.apiUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.adjutor.apiKey}`,
      },
      timeout: 30000,
    });

    //response interceptor for logging
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error("Adjutor API Error:", {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  async createCustomerAndCheckBlacklist(
    customerData: AdjutorCustomerRequest
  ): Promise<AdjutorCreateCustomerResponse> {
    try {
      logger.info("Creating customer on Adjutor", {
        email: customerData.email,
        phone: customerData.phone_number,
      });

      const response = await this.api.post<AdjutorCreateCustomerResponse>(
        "/customers",
        customerData
      );

      logger.info("Customer created on Adjutor", {
        customerId: response.data.data.user.id,
        blacklisted: response.data.data.user.blacklisted,
      });
      console.log("ADJUTOR RESPONSE:", response.data);
      console.log(
        "ADJUTOR ID:",
        response?.data.data.user.id,
        typeof response?.data.data.user.id
      );
      return response.data;
    } catch (error: any) {
      // Handling specific Adjutor API errors
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || "Adjutor API error";

        logger.error("Adjutor API returned error", {
          status,
          message,
          data: error.response.data,
        });

        if (status === 400) {
          throw new AppError(400, `Validation error: ${message}`);
        } else if (status === 401) {
          throw new AppError(
            500,
            "Authentication failed with verification service"
          );
        } else if (status === 409) {
          throw new AppError(
            409,
            "Customer already exists on verification service"
          );
        } else {
          throw new AppError(
            500,
            "Failed to verify customer with external service"
          );
        }
      }

      if (error.code === "ECONNABORTED") {
        throw new AppError(
          500,
          "Verification service timeout. Please try again."
        );
      }
      const userMessage =
        "Verification service is currently unavailable. Please try again later.";
      logger.error("Unexpected error calling Adjutor API", { error });
      throw new AppError(400, userMessage);
    }
  }

  /**
   * Validating customer data before sending to Adjutor
   */

  validateCustomerData(data: AdjutorCustomerRequest): void {
    console.log("DOB RECEIVED:", data.dob, typeof data.dob);

    let dobStr: string;

    if (data.dob instanceof Date) {
      // Convert Date to YYYY-MM-DD
      dobStr = data.dob.toISOString().split("T")[0];
    } else if (typeof data.dob === "string") {
      dobStr = data.dob.trim();
    } else {
      throw new AppError(400, "Date of birth must be a valid date");
    }

    if (!/^\d{11}$/.test(data.bvn)) {
      throw new AppError(400, "BVN must be exactly 11 digits");
    }
    if (!/^(\+?234|0)[789]\d{9}$/.test(data.phone_number)) {
      throw new AppError(400, "Invalid phone number format");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
      throw new AppError(400, "Date of birth must be in YYYY-MM-DD format");
    }
    if (!/^\d{10}$/.test(data.account_number)) {
      throw new AppError(400, "Account number must be exactly 10 digits");
    }

    if (!data.documents || data.documents.length === 0) {
      throw new AppError(400, "At least one document is required");
    }
  }
}
