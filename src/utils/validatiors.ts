import Joi from 'joi';

export const registerUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phone_number: Joi.string()
    .pattern(/^(\+?234|0)[789]\d{9}$/)
    .required(),
  first_name: Joi.string().min(2).required(),
  last_name: Joi.string().min(2).required(),
  bvn: Joi.string().length(11).required(),
  bvn_phone_number: Joi.string()
    .pattern(/^(\+?234|0)[789]\d{9}$/)
    .required(),
  dob: Joi.date().iso().required(),
  account_number: Joi.string().length(10).required(),
  bank_code: Joi.string().length(3).required(),
  state: Joi.string().required(),
  city: Joi.string().required(),
  address: Joi.string().required(),
  photo_url: Joi.string().uri().optional(),
  documents: Joi.array().items(Joi.string().uri()).min(1).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const fundWalletSchema = Joi.object({
  amount: Joi.number().positive().required(),
});

export const transferSchema = Joi.object({
  recipient_account_number: Joi.string().length(10).required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().optional(),
});

export const withdrawSchema = Joi.object({
  amount: Joi.number().positive().required(),
  description: Joi.string().optional(),
});