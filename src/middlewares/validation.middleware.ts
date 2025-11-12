import { Request, Response, NextFunction } from "express";
import { ObjectSchema, ValidationError } from "joi";

export const validateRequest = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details[0].message;
      return res.status(400).json({
        success: false,
        message: message.replace(/"/g, ""),
      });
    }

    req.body = value;

    next();
  };
};
