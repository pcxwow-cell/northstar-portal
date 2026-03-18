const { z } = require('zod');

// Reusable validation middleware factory
function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.issues.map(e => ({ field: e.path.join('.'), message: e.message }));
        res.status(400).json({ error: 'Validation failed', details: errors });
      } else {
        next(err);
      }
    }
  };
}

// ─── Schemas ───

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
});

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  location: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional().default('Pre-Development'),
  description: z.string().optional(),
  sqft: z.string().optional(),
  units: z.number().int().min(0).optional(),
  totalRaise: z.number().min(0).optional(),
  estimatedCompletion: z.string().optional(),
  unitsSold: z.number().int().min(0).optional(),
  revenue: z.number().min(0).optional(),
  prefReturnPct: z.number().min(0).max(100).optional().default(8),
  gpCatchupPct: z.number().min(0).max(100).optional().default(100),
  carryPct: z.number().min(0).max(100).optional().default(20),
}).passthrough();

const inviteInvestorSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required').max(200),
  role: z.enum(['INVESTOR', 'ADMIN', 'GP']).optional().default('INVESTOR'),
}).passthrough();

const recordCashFlowSchema = z.object({
  userId: z.number().int().positive(),
  projectId: z.number().int().positive(),
  date: z.string().min(1, 'Date is required'),
  amount: z.number({ required_error: 'Amount is required' }),
  type: z.enum(['capital_call', 'distribution', 'return_of_capital', 'income']),
  description: z.string().optional(),
});

const prospectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  entityType: z.string().optional(),
  accreditationStatus: z.string().optional(),
  investmentRange: z.string().optional(),
  interestedProjectId: z.number().int().positive().optional().nullable(),
  message: z.string().max(5000).optional(),
});

const createThreadSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Message body is required').max(10000),
  targetType: z.string().optional(),
  targetProjectId: z.number().int().positive().optional().nullable(),
  recipientIds: z.array(z.number().int().positive()).optional(),
});

const replyThreadSchema = z.object({
  body: z.string().min(1, 'Message body is required').max(10000),
});

const uploadDocumentSchema = z.object({
  name: z.string().min(1, 'Document name is required').max(500),
  category: z.string().min(1, 'Category is required'),
  projectId: z.string().optional().nullable(),
  status: z.string().optional(),
}).passthrough();

const signatureRequestSchema = z.object({
  documentId: z.union([z.number().int().positive(), z.string().min(1)]),
  signerIds: z.array(z.union([z.number().int().positive(), z.string().min(1)])).min(1, 'At least one signer required'),
  subject: z.string().optional(),
  message: z.string().optional(),
});

const calculateIrrSchema = z.object({
  cashFlows: z.array(z.object({
    date: z.string().min(1, 'Date is required'),
    amount: z.number({ required_error: 'Amount is required' }),
  })).min(2, 'At least 2 cash flows required for IRR calculation'),
});

const calculateWaterfallSchema = z.object({
  totalDistributable: z.number().min(0, 'Must be non-negative'),
  structure: z.object({
    prefReturnPct: z.number().min(0).max(100, 'Must be 0-100%'),
    gpCatchupPct: z.number().min(0).max(100, 'Must be 0-100%'),
    carryPct: z.number().min(0).max(100, 'Must be 0-100%'),
    lpCapital: z.number().min(0, 'Must be non-negative'),
    holdPeriodYears: z.number().min(0.01).max(100, 'Must be 0.01-100 years'),
  }),
});

module.exports = {
  validate,
  loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema,
  createProjectSchema, inviteInvestorSchema, recordCashFlowSchema,
  prospectSchema, createThreadSchema, replyThreadSchema,
  uploadDocumentSchema, signatureRequestSchema,
  calculateIrrSchema, calculateWaterfallSchema,
};
