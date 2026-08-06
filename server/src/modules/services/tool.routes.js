import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { sendData } from '../../utils/apiResponse.js';

export const toolRouter = Router();
const schema = z.object({ amount: z.coerce.number().positive().max(1_000_000_000), annualRate: z.coerce.number().min(0.1).max(50), tenureMonths: z.coerce.number().int().min(1).max(480), loanType: z.enum(['home','personal','business','property']).default('home') });
toolRouter.post('/emi', rateLimit({windowMs:60_000,limit:60}), validate(schema), (request,response)=>{
  const {amount,annualRate,tenureMonths,loanType}=request.body; const rate=annualRate/1200; const emi=rate===0?amount/tenureMonths:amount*rate*(1+rate)**tenureMonths/((1+rate)**tenureMonths-1); let balance=amount; const schedule=[];
  for(let month=1;month<=tenureMonths;month+=1){const interest=balance*rate;const principal=Math.min(balance,emi-interest);balance=Math.max(0,balance-principal);schedule.push({month,principal:Math.round(principal),interest:Math.round(interest),balance:Math.round(balance)});}
  const monthlyEmi=Math.round(emi); const totalRepayment=Math.round(emi*tenureMonths); sendData(response,{loanType,amount,annualRate,tenureMonths,monthlyEmi,totalInterest:totalRepayment-amount,totalRepayment,schedule,disclaimer:'This is an illustrative estimate, not a loan offer or approval. Actual terms depend on the relevant lender and applicant profile.'});
});
