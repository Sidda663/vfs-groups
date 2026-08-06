import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ADMIN_ROLES, requireAuth, requireRole } from '../../middleware/auth.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { AuditLog } from '../../models/AuditLog.js';
import { Application, APPLICATION_STATUSES } from '../../models/Application.js';
import { ApplicationDocument, NRI_DOCUMENT_TYPES } from '../../models/ApplicationDocument.js';
import { ApplicationStatusHistory } from '../../models/ApplicationStatusHistory.js';
import { CallbackRequest } from '../../models/CallbackRequest.js';
import { Contractor } from '../../models/Contractor.js';
import { Customer } from '../../models/Customer.js';
import { LoanReferral, LOAN_REFERRAL_STATUSES } from '../../models/LoanReferral.js';
import { LoginActivity } from '../../models/LoginActivity.js';
import { RefreshToken } from '../../models/RefreshToken.js';
import { Referral, REFERRAL_STATUSES } from '../../models/Referral.js';
import { Role } from '../../models/Role.js';
import { User } from '../../models/User.js';
import { VerificationChallenge } from '../../models/VerificationChallenge.js';
import { storageProvider } from '../../providers/storage.js';
import { ApiError } from '../../utils/apiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';
import { registerCustomerSchema } from '../auth/auth.schemas.js';
import { registerCustomerForConnector } from '../auth/auth.service.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

async function memberDashboard(userId, portal) {
  const [user, recentLogins, loanReferrals, loanReferralCount, connector] = await Promise.all([
    User.findById(userId).populate('roles', 'name slug').populate('referredBy', 'fullName referralCode').lean(),
    LoginActivity.find({ user: userId }).sort({ loginAt: -1 }).limit(5).lean(),
    LoanReferral.find({ submittedBy: userId }).populate('service', 'name slug').sort({ createdAt: -1 }).limit(5).lean(),
    LoanReferral.countDocuments({ submittedBy: userId }),
    portal === 'contractor' ? Contractor.findOne({ user: userId }).lean() : Promise.resolve(null),
  ]);
  let referredUsers = []; let referralMetrics = { totalReferrals: 0, pendingReferrals: 0, approvedReferrals: 0, rejectedReferrals: 0 };
  if (connector) {
    const [referrals, statusCounts] = await Promise.all([
      Referral.find({ connector: connector._id }).populate({ path: 'customer', populate: { path: 'user', select: 'fullName email mobile createdAt' } }).sort({ createdAt: -1 }).limit(5).lean(),
      Referral.aggregate([{ $match: { connector: connector._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const counts = new Map(statusCounts.map((item) => [item._id, item.count]));
    referralMetrics = {
      totalReferrals: statusCounts.reduce((total, item) => total + item.count, 0),
      pendingReferrals: counts.get('pending') || 0,
      approvedReferrals: counts.get('approved') || 0,
      rejectedReferrals: counts.get('rejected') || 0,
    };
    referredUsers = referrals.map((item) => ({ ...item.customer?.user, referralStatus: item.status, approvedAt: item.approvedAt, rejectedAt: item.rejectedAt, referralId: item._id }));
    user.referralCode = connector.referralCode || user.referralCode;
  } else {
    delete user.referralCode; delete user.referredBy; delete user.referredByCode;
  }
  return { user, metrics: { ...referralMetrics, registeredThroughCode: referralMetrics.totalReferrals, loanReferralsSubmitted: loanReferralCount }, referredUsers, recentLogins, recentLoanReferrals: loanReferrals };
}

dashboardRouter.get('/customer', requireRole('customer'), asyncHandler(async (request, response) => sendData(response, await memberDashboard(request.user._id, 'customer'))));
dashboardRouter.get('/contractor', requireRole('contractor'), asyncHandler(async (request, response) => sendData(response, await memberDashboard(request.user._id, 'contractor'))));
dashboardRouter.post('/contractor/customers', requireRole('contractor'), requireCsrf, validate(registerCustomerSchema.omit({ referralCode: true })), asyncHandler(async (request, response) => {
  const user = await registerCustomerForConnector(request.body, request.user._id, request);
  sendData(response, { user, message: 'Customer account created and approved under your referral code.' }, 201);
}));

for (const portal of ['customer', 'contractor']) {
  dashboardRouter.get(`/${portal}/referred-users`, requireRole(portal), paginatedMemberCollection('referred-users'));
  dashboardRouter.get(`/${portal}/service-referrals`, requireRole(portal), paginatedMemberCollection('service-referrals'));
  dashboardRouter.get(`/${portal}/login-activity`, requireRole(portal), paginatedMemberCollection('login-activity'));
}

function paginatedMemberCollection(collection) {
  return asyncHandler(async (request, response) => {
    const page = Math.max(1, Number(request.query.page) || 1); const limit = Math.min(50, Math.max(5, Number(request.query.limit) || 10)); const skip = (page - 1) * limit; const userId = request.user._id;
    let query; let count;
    if (collection === 'referred-users') {
      const connector = await Contractor.findOne({ user: userId }).select('_id');
      if (!connector) { sendData(response, [], 200, { page, limit, total: 0, pages: 0 }); return; }
      query = Referral.find({ connector: connector._id }).populate({ path: 'customer', populate: { path: 'user', select: 'fullName email mobile createdAt' } }).sort({ createdAt: -1 });
      count = Referral.countDocuments({ connector: connector._id });
    } else if (collection === 'service-referrals') {
      query = LoanReferral.find({ submittedBy: userId }).populate('service', 'name slug').sort({ createdAt: -1 });
      count = LoanReferral.countDocuments({ submittedBy: userId });
    } else {
      query = LoginActivity.find({ user: userId }).sort({ loginAt: -1 });
      count = LoginActivity.countDocuments({ user: userId });
    }
    const [items, total] = await Promise.all([query.skip(skip).limit(limit).lean(), count]);
    const data = collection === 'referred-users' ? items.map((item) => ({ ...item.customer?.user, referralStatus: item.status, approvedAt: item.approvedAt, rejectedAt: item.rejectedAt, referralId: item._id })) : items;
    sendData(response, data, 200, { page, limit, total, pages: Math.ceil(total / limit) });
  });
}

dashboardRouter.get('/admin', requireRole(...ADMIN_ROLES), asyncHandler(async (_request, response) => {
  const [customerRole, contractorRole] = await Promise.all([Role.findOne({ slug: 'customer' }), Role.findOne({ slug: 'contractor' })]);
  const [totalCallbackRequests, recentCallbackRequests] = await Promise.all([
    CallbackRequest.countDocuments(),
    CallbackRequest.find().populate('service', 'name slug category').sort({ createdAt: -1 }).limit(15).lean(),
  ]);
  const [totalUsers, totalCustomers, totalContractors, loginTotals, referredRegistrations, directRegistrations, totalCodes, totalLoanReferrals, recentRegistrations, recentLogins, recentLoanReferrals, mostUsedCodes, topCustomers, topContractors, loanReferralsByUser, totalApplications, applicationStatusTotals] = await Promise.all([
    User.countDocuments({ status: { $ne: 'deleted' } }),
    User.countDocuments({ roles: customerRole?._id, status: { $ne: 'deleted' } }),
    User.countDocuments({ roles: contractorRole?._id, status: { $ne: 'deleted' } }),
    User.aggregate([{ $group: { _id: null, total: { $sum: '$successfulLoginCount' }, unique: { $sum: { $cond: [{ $gt: ['$successfulLoginCount', 0] }, 1, 0] } } } }]),
    User.countDocuments({ referredBy: { $exists: true, $ne: null }, status: { $ne: 'deleted' } }), User.countDocuments({ referredBy: { $exists: false }, status: { $ne: 'deleted' } }), User.countDocuments({ referralCode: { $exists: true, $ne: null }, status: { $ne: 'deleted' } }), LoanReferral.countDocuments(),
    User.find({ status: { $ne: 'deleted' } }).populate('roles', 'name slug').populate('referredBy', 'fullName referralCode').sort({ createdAt: -1 }).limit(10).lean(),
    LoginActivity.find().populate('user', 'fullName email mobile referralCode').sort({ loginAt: -1 }).limit(15).lean(),
    LoanReferral.find().populate('submittedBy', 'fullName referralCode').populate('service', 'name').sort({ createdAt: -1 }).limit(15).lean(),
    User.aggregate([{ $match: { referredByCode: { $exists: true, $ne: null } } }, { $group: { _id: '$referredByCode', registrations: { $sum: 1 } } }, { $sort: { registrations: -1 } }, { $limit: 10 }, { $lookup: { from: 'users', localField: '_id', foreignField: 'referralCode', as: 'owner' } }, { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, referralCode: '$_id', registrations: 1, owner: { _id: '$owner._id', fullName: '$owner.fullName' } } }]),
    topReferrers(customerRole?._id), topReferrers(contractorRole?._id),
    LoanReferral.aggregate([{ $group: { _id: '$submittedBy', submissions: { $sum: 1 } } }, { $sort: { submissions: -1 } }, { $limit: 20 }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }, { $unwind: '$user' }, { $project: { _id: 0, user: { _id: '$user._id', fullName: '$user.fullName', referralCode: '$user.referralCode' }, submissions: 1 } }]),
    Application.countDocuments({ customer: { $exists: true, $ne: null }, status: { $ne: 'draft' } }), Application.aggregate([{ $match: { customer: { $exists: true, $ne: null }, status: { $ne: 'draft' } } }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
  ]);
  sendData(response, { metrics: { totalUsers, totalCustomers, totalContractors, totalSuccessfulLogins: loginTotals[0]?.total || 0, uniqueUsersLoggedIn: loginTotals[0]?.unique || 0, referredRegistrations, directRegistrations, totalReferralCodes: totalCodes, totalLoanReferrals, totalApplications, totalCallbackRequests }, applicationStatusTotals, recentRegistrations, recentLogins, recentLoanReferrals, recentCallbackRequests, mostUsedReferralCodes: mostUsedCodes, topReferringCustomers: topCustomers, topReferringContractors: topContractors, loanReferralsByUser });
}));

dashboardRouter.get('/admin/referral-requests', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const status = REFERRAL_STATUSES.includes(request.query.status) ? request.query.status : undefined;
  const filter = status ? { status } : {};
  const items = await Referral.find(filter)
    .populate({ path: 'customer', populate: { path: 'user', select: 'fullName email mobile createdAt' } })
    .populate({ path: 'connector', populate: { path: 'user', select: 'fullName email mobile' } })
    .populate('approvedBy rejectedBy', 'fullName')
    .sort({ createdAt: -1 }).lean();
  sendData(response, items);
}));

const referralDecisionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('approved') }).strict(),
  z.object({ status: z.literal('rejected'), rejectionReason: z.string().trim().min(3).max(500) }).strict(),
]);
dashboardRouter.patch('/admin/referral-requests/:id/decision', requireRole(...ADMIN_ROLES), requireCsrf, validate(referralDecisionSchema), asyncHandler(async (request, response) => {
  const session = await mongoose.startSession(); let referral;
  try {
    await session.withTransaction(async () => {
      referral = await Referral.findOne({ _id: request.params.id, status: 'pending' }).session(session);
      if (!referral) throw new ApiError(409, 'REFERRAL_ALREADY_DECIDED', 'This referral has already been reviewed or does not exist.');
      const customer = await Customer.findById(referral.customer).session(session);
      const connector = await Contractor.findById(referral.connector).session(session);
      if (!customer || !connector) throw new ApiError(409, 'REFERRAL_ACCOUNT_MISSING', 'The customer or connector profile is unavailable.');
      const now = new Date(); referral.status = request.body.status;
      if (request.body.status === 'approved') {
        referral.approvedAt = now; referral.approvedBy = request.user._id; referral.rejectionReason = undefined;
        customer.connector = connector._id; customer.referralApprovalStatus = 'approved';
        await User.updateOne({ _id: customer.user }, { $set: { referredBy: connector.user, referredByCode: referral.referralCode } }, { session });
      } else {
        referral.rejectedAt = now; referral.rejectedBy = request.user._id; referral.rejectionReason = request.body.rejectionReason;
        customer.connector = null; customer.referralApprovalStatus = 'rejected';
        await User.updateOne({ _id: customer.user }, { $unset: { referredBy: '', referredByCode: '' } }, { session });
      }
      await Promise.all([referral.save({ session }), customer.save({ session })]);
      await AuditLog.create([{ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: `customer_referral.${request.body.status}`, resourceType: 'Referral', resourceId: referral._id, newValues: { status: referral.status, rejectionReason: referral.rejectionReason }, reason: request.body.rejectionReason || 'Referral approved by administrator', ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }], { session });
    });
  } finally { await session.endSession(); }
  sendData(response, await Referral.findById(referral._id).populate({ path: 'customer', populate: { path: 'user', select: 'fullName email mobile createdAt' } }).populate({ path: 'connector', populate: { path: 'user', select: 'fullName' } }));
}));

const connectorCodeSchema = z.object({ referralCode: z.string().trim().toUpperCase().regex(/^CONN-[A-Z0-9]{6,20}$/, 'Use a code such as CONN-8XJ4K2'), reason: z.string().trim().min(3).max(500) }).strict();
dashboardRouter.patch('/admin/connectors/:id/referral-code', requireRole(...ADMIN_ROLES), requireCsrf, validate(connectorCodeSchema), asyncHandler(async (request, response) => {
  const connector = await Contractor.findOne({ user: request.params.id });
  if (!connector) throw new ApiError(404, 'CONNECTOR_NOT_FOUND', 'Connector not found.');
  const duplicate = await Contractor.exists({ _id: { $ne: connector._id }, referralCode: request.body.referralCode });
  if (duplicate) throw new ApiError(409, 'REFERRAL_CODE_EXISTS', 'This referral code is already assigned to another connector.');
  const oldCode = connector.referralCode; connector.referralCode = request.body.referralCode; await connector.save();
  await User.updateOne({ _id: connector.user }, { $set: { referralCode: connector.referralCode } });
  await AuditLog.create({ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: 'connector.referral_code.updated', resourceType: 'Contractor', resourceId: connector._id, oldValues: { referralCode: oldCode }, newValues: { referralCode: connector.referralCode }, reason: request.body.reason, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id });
  sendData(response, { referralCode: connector.referralCode });
}));

dashboardRouter.get('/admin/callback-requests', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
  const filter = {}; const q = String(request.query.q || '').trim();
  if (q) { const regex = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ name: regex }, { mobile: regex }]; }
  if (request.query.status) filter.status = request.query.status;
  const [items, total] = await Promise.all([
    CallbackRequest.find(filter).populate('service', 'name slug category').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CallbackRequest.countDocuments(filter),
  ]);
  sendData(response, items, 200, { page, limit, total, pages: Math.ceil(total / limit) });
}));

const callbackStatusSchema = z.object({ status: z.enum(['new', 'scheduled', 'completed', 'cancelled']) });
dashboardRouter.patch('/admin/callback-requests/:id/status', requireRole(...ADMIN_ROLES), requireCsrf, validate(callbackStatusSchema), asyncHandler(async (request, response) => {
  const item = await CallbackRequest.findByIdAndUpdate(request.params.id, { $set: { status: request.body.status } }, { new: true, runValidators: true }).populate('service', 'name slug category');
  if (!item) throw new ApiError(404, 'CALLBACK_REQUEST_NOT_FOUND', 'Callback request not found.');
  sendData(response, item);
}));

const bulkDeleteSchema = z.object({
  type: z.enum(['users', 'callbacks', 'loanReferrals', 'applications']),
  ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(100),
  reason: z.string().trim().min(3).max(500),
}).strict();

dashboardRouter.delete('/admin/records', requireRole(...ADMIN_ROLES), requireCsrf, validate(bulkDeleteSchema), asyncHandler(async (request, response) => {
  const { type, ids, reason } = request.body;
  const session = await mongoose.startSession(); let deleted = 0;
  try {
    await session.withTransaction(async () => {
      if (type === 'users') {
        for (const id of ids) {
          const user = await editableMember(id, request.user._id, session);
          const oldValues = { fullName: user.fullName, email: user.email, mobile: user.mobile, status: user.status };
          user.status = 'deleted'; user.deletedAt = new Date(); user.tokenVersion += 1; await user.save({ session });
          await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } }, { session });
          await AuditLog.create([{ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: 'member.access.removed', resourceType: 'User', resourceId: user._id, oldValues, newValues: { status: 'deleted', recordsPreserved: true }, reason, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }], { session });
          deleted += 1;
        }
        return;
      }

      const config = {
        callbacks: { Model: CallbackRequest, resourceType: 'CallbackRequest', action: 'callback.deleted' },
        loanReferrals: { Model: LoanReferral, resourceType: 'LoanReferral', action: 'loan_referral.deleted' },
        applications: { Model: Application, resourceType: 'Application', action: 'application.deleted' },
      }[type];
      const records = await config.Model.find({ _id: { $in: ids } }).session(session).lean();
      if (type === 'applications' && records.length) {
        const applicationIds = records.map((item) => item._id);
        await Promise.all([
          ApplicationStatusHistory.deleteMany({ application: { $in: applicationIds } }).session(session),
          VerificationChallenge.deleteMany({ application: { $in: applicationIds } }).session(session),
        ]);
      }
      const result = await config.Model.deleteMany({ _id: { $in: records.map((item) => item._id) } }).session(session);
      deleted = result.deletedCount;
      if (records.length) await AuditLog.create(records.map((item) => ({ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: config.action, resourceType: config.resourceType, resourceId: item._id, oldValues: { identifier: item.applicationId || item.referralId || item.name || String(item._id) }, newValues: { deleted: true }, reason, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id })), { session });
    });
  } finally { await session.endSession(); }
  sendData(response, { type, deleted, recordsPreserved: type === 'users' });
}));

function topReferrers(roleId) {
  if (!roleId) return [];
  return User.aggregate([{ $match: { referredBy: { $exists: true, $ne: null }, status: { $ne: 'deleted' } } }, { $group: { _id: '$referredBy', registrations: { $sum: 1 } } }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'owner' } }, { $unwind: '$owner' }, { $match: { 'owner.roles': roleId, 'owner.status': { $ne: 'deleted' } } }, { $sort: { registrations: -1 } }, { $limit: 10 }, { $project: { _id: 0, owner: { _id: '$owner._id', fullName: '$owner.fullName', referralCode: '$owner.referralCode' }, registrations: 1 } }]);
}

dashboardRouter.get('/admin/users', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
  const filter = { status: { $ne: 'deleted' } }; const q = String(request.query.q || '').trim();
  if (q) { const regex = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ fullName: regex }, { email: regex }, { mobile: regex }, { referralCode: regex }]; }
  if (request.query.role) { const role = await Role.findOne({ slug: request.query.role }); filter.roles = role?._id || null; }
  const [users, total] = await Promise.all([User.find(filter).populate('roles', 'name slug').populate('referredBy', 'fullName referralCode').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), User.countDocuments(filter)]);
  const ids = users.map((user) => user._id); const [loanCounts, customerProfiles, contractorProfiles] = await Promise.all([LoanReferral.aggregate([{ $match: { submittedBy: { $in: ids } } }, { $group: { _id: '$submittedBy', count: { $sum: 1 } } }]), Customer.find({ user: { $in: ids } }).lean(), Contractor.find({ user: { $in: ids } }).lean()]);
  const connectorIds = contractorProfiles.map((profile) => profile._id); const approvedCounts = await Referral.aggregate([{ $match: { connector: { $in: connectorIds }, status: 'approved' } }, { $group: { _id: '$connector', count: { $sum: 1 } } }]);
  const approvalMap = new Map(approvedCounts.map((item) => [String(item._id), item.count])); const loanMap = new Map(loanCounts.map((item) => [String(item._id), item.count]));
  const profileMap = new Map([...customerProfiles, ...contractorProfiles].map((profile) => [String(profile.user), profile]));
  sendData(response, users.map((user) => { const profile = profileMap.get(String(user._id)) || null; return { ...user, referralCode: profile?.referralCode || user.referralCode, profile, approvedReferralCount: profile ? approvalMap.get(String(profile._id)) || 0 : 0, referredUsersCount: profile ? approvalMap.get(String(profile._id)) || 0 : 0, loanReferralsCount: loanMap.get(String(user._id)) || 0 }; }), 200, { page, limit, total, pages: Math.ceil(total / limit) });
}));

dashboardRouter.get('/admin/users/:id', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const user = await User.findOne({ _id: request.params.id, status: { $ne: 'deleted' } }).populate('roles', 'name slug').populate('referredBy', 'fullName email mobile referralCode').lean();
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
  const roleSlugs = user.roles.map((role) => role.slug); const Profile = roleSlugs.includes('contractor') ? Contractor : roleSlugs.includes('customer') ? Customer : null;
  const [profile, loanReferrals, loginActivity] = await Promise.all([Profile ? Profile.findOne({ user: user._id }).lean() : Promise.resolve(null), LoanReferral.find({ submittedBy: user._id }).populate('service', 'name slug').sort({ createdAt: -1 }).lean(), LoginActivity.find({ user: user._id }).sort({ loginAt: -1 }).limit(50).lean()]);
  const referralRecords = profile && roleSlugs.includes('contractor') ? await Referral.find({ connector: profile._id }).populate({ path: 'customer', populate: { path: 'user', select: 'fullName email mobile createdAt' } }).sort({ createdAt: -1 }).lean() : [];
  const referredUsers = referralRecords.map((item) => ({ ...item.customer?.user, referralStatus: item.status, approvedAt: item.approvedAt, rejectionReason: item.rejectionReason }));
  sendData(response, { user: { ...user, referralCode: profile?.referralCode || user.referralCode }, profile, referredUsers, referralRecords, loanReferrals, loginActivity, metrics: { referredUsers: referralRecords.filter((item) => item.status === 'approved').length, approvedReferrals: referralRecords.filter((item) => item.status === 'approved').length, loanReferrals: loanReferrals.length, successfulLogins: user.successfulLoginCount || 0 } });
}));

const adminUserUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(100), country: z.literal('India').default('India'), city: z.string().trim().max(80), state: z.string().trim().max(80),
  businessName: z.string().trim().max(150).optional(), status: z.enum(['active', 'suspended']), reason: z.string().trim().min(3).max(500),
}).strict();
const adminUserRemoveSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();

dashboardRouter.patch('/admin/users/:id', requireRole(...ADMIN_ROLES), requireCsrf, validate(adminUserUpdateSchema), asyncHandler(async (request, response) => {
  const session = await mongoose.startSession(); let accountType;
  try {
    await session.withTransaction(async () => {
      const user = await editableMember(request.params.id, request.user._id, session); const roleSlugs = user.roles.map((role) => role.slug);
      accountType = roleSlugs.includes('contractor') ? 'contractor' : 'customer';
      if (accountType !== 'contractor' && request.body.businessName !== undefined) throw new ApiError(422, 'FIELD_NOT_EDITABLE', 'Business name can only be changed for connector accounts.');
      const oldValues = { fullName: user.fullName, status: user.status }; const newValues = { fullName: request.body.fullName, status: request.body.status, country: request.body.country, city: request.body.city, state: request.body.state };
      user.fullName = request.body.fullName; user.status = request.body.status; await user.save({ session });
      const Profile = accountType === 'contractor' ? Contractor : Customer; const profile = await Profile.findOne({ user: user._id }).session(session);
      if (!profile) throw new ApiError(409, 'MEMBER_PROFILE_MISSING', 'The member profile is missing. Account changes were not saved.');
      oldValues.country = profile.country || 'India'; oldValues.city = profile.city || ''; oldValues.state = profile.state || ''; profile.country = request.body.country; profile.city = request.body.city; profile.state = request.body.state;
      if (accountType === 'contractor') { oldValues.businessName = profile.businessName || ''; profile.businessName = request.body.businessName || ''; newValues.businessName = profile.businessName; }
      await profile.save({ session });
      if (request.body.status === 'suspended') await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } }, { session });
      await AuditLog.create([{ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: 'member.profile.updated', resourceType: 'User', resourceId: user._id, oldValues, newValues, reason: request.body.reason, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }], { session });
    });
  } finally { await session.endSession(); }
  const user = await User.findById(request.params.id).populate('roles', 'name slug').lean(); const Profile = accountType === 'contractor' ? Contractor : Customer; const profile = await Profile.findOne({ user: request.params.id }).lean();
  sendData(response, { user, profile });
}));

dashboardRouter.delete('/admin/users/:id', requireRole(...ADMIN_ROLES), requireCsrf, validate(adminUserRemoveSchema), asyncHandler(async (request, response) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const user = await editableMember(request.params.id, request.user._id, session); const oldValues = { fullName: user.fullName, email: user.email, mobile: user.mobile, status: user.status };
      user.status = 'deleted'; user.deletedAt = new Date(); user.tokenVersion += 1; await user.save({ session });
      await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } }, { session });
      await AuditLog.create([{ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: 'member.access.removed', resourceType: 'User', resourceId: user._id, oldValues, newValues: { status: 'deleted', recordsPreserved: true }, reason: request.body.reason, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }], { session });
    });
  } finally { await session.endSession(); }
  sendData(response, { id: request.params.id, removed: true, recordsPreserved: true });
}));

async function editableMember(id, actorId, session) {
  if (String(id) === String(actorId)) throw new ApiError(403, 'SELF_MANAGEMENT_BLOCKED', 'You cannot manage your own administrator account here.');
  const user = await User.findOne({ _id: id, status: { $ne: 'deleted' } }).select('+tokenVersion').populate('roles', 'name slug').session(session);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
  const roleSlugs = user.roles.map((role) => role.slug);
  if (roleSlugs.some((role) => ADMIN_ROLES.includes(role)) || !roleSlugs.some((role) => ['customer', 'contractor'].includes(role))) throw new ApiError(403, 'MEMBER_ACCOUNT_REQUIRED', 'Only customer and connector accounts can be managed here.');
  return user;
}

dashboardRouter.get('/admin/referrals/:code', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const owner = await User.findOne({ referralCode: request.params.code.toUpperCase() }).populate('roles', 'name slug').lean();
  if (!owner) throw new ApiError(404, 'REFERRAL_CODE_NOT_FOUND', 'Referral code not found.');
  const [registrations, loanReferrals] = await Promise.all([User.find({ referredBy: owner._id }).select('fullName email mobile roles referralCode referredByCode createdAt').populate('roles', 'name slug').sort({ createdAt: -1 }).lean(), LoanReferral.find({ submittedBy: owner._id }).populate('service', 'name slug').sort({ createdAt: -1 }).lean()]);
  sendData(response, { referralCode: owner.referralCode, owner, registrations, loanReferrals, metrics: { registrations: registrations.length, loanReferrals: loanReferrals.length } });
}));

dashboardRouter.get('/admin/loan-referrals', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25)); const filter = {};
  if (request.query.role) filter.submitterRole = request.query.role; if (request.query.status) filter.status = request.query.status;
  if (request.query.dateFrom || request.query.dateTo) filter.createdAt = { ...(request.query.dateFrom ? { $gte: new Date(request.query.dateFrom) } : {}), ...(request.query.dateTo ? { $lte: new Date(request.query.dateTo) } : {}) };
  const q = String(request.query.q || '').trim();
  if (q) { const regex = new RegExp(escapeRegex(q), 'i'); const submitters = await User.find({ fullName: regex }).distinct('_id'); filter.$or = [{ referralId: regex }, { 'applicant.fullName': regex }, { submitterReferralCode: regex }, { submittedBy: { $in: submitters } }]; }
  const [items, total] = await Promise.all([LoanReferral.find(filter).populate('submittedBy', 'fullName email mobile referralCode').populate('service', 'name slug').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), LoanReferral.countDocuments(filter)]);
  sendData(response, items, 200, { page, limit, total, pages: Math.ceil(total / limit) });
}));

const statusSchema = z.object({ status: z.enum(LOAN_REFERRAL_STATUSES), reason: z.string().trim().min(3).max(500) });
dashboardRouter.patch('/admin/loan-referrals/:id/status', requireRole(...ADMIN_ROLES), requireCsrf, validate(statusSchema), asyncHandler(async (request, response) => {
  const item = await LoanReferral.findById(request.params.id); if (!item) throw new ApiError(404, 'LOAN_REFERRAL_NOT_FOUND', 'Loan referral not found.'); const oldStatus = item.status;
  item.status = request.body.status; item.statusUpdatedAt = new Date(); await item.save();
  await AuditLog.create({ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: 'loan_referral.status.updated', resourceType: 'LoanReferral', resourceId: item._id, oldValues: { status: oldStatus }, newValues: { status: item.status }, reason: request.body.reason, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id });
  sendData(response, await LoanReferral.findById(item._id).populate('submittedBy', 'fullName referralCode').populate('service', 'name slug'));
}));

dashboardRouter.get('/admin/applications', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25)); const filter = { customer: { $exists: true, $ne: null }, status: { $ne: 'draft' } };
  if (request.query.status) filter.status = request.query.status;
  if (request.query.service) filter.service = request.query.service;
  if (request.query.dateFrom || request.query.dateTo) filter.createdAt = { ...(request.query.dateFrom ? { $gte: new Date(request.query.dateFrom) } : {}), ...(request.query.dateTo ? { $lte: new Date(`${request.query.dateTo}T23:59:59.999Z`) } : {}) };
  const q = String(request.query.q || '').trim(); if (q) { const regex = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ applicationId: regex }, { leadId: regex }, { 'personal.fullName': regex }, { 'personal.mobile': regex }, { 'personal.email': regex }]; }
  const [items, total] = await Promise.all([Application.find(filter).populate('service', 'name slug category').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Application.countDocuments(filter)]);
  sendData(response, items, 200, { page, limit, total, pages: Math.ceil(total / limit) });
}));

dashboardRouter.get('/admin/applications/:id', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const application = await Application.findOne({ _id: request.params.id, customer: { $exists: true, $ne: null } }).populate('service', 'name slug category').lean(); if (!application) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found.');
  const [history, customer, documents] = await Promise.all([
    ApplicationStatusHistory.find({ application: application._id }).select('+internalNote').populate('changedBy', 'fullName').sort({ createdAt: 1 }).lean(),
    Customer.findById(application.customer).select('customerType').lean(),
    ApplicationDocument.find({ application: application._id }).select('documentKey originalName mimeType size storage status rejectionReason createdAt verifiedAt').sort({ createdAt: -1 }).lean(),
  ]);
  const latestDocuments = new Map(); for (const document of documents) if (!latestDocuments.has(document.documentKey)) latestDocuments.set(document.documentKey, document);
  sendData(response, { application, history, customerType: customer?.customerType || 'indian', documentRequirements: customer?.customerType === 'nri' ? NRI_DOCUMENT_TYPES.map((type) => { const document = latestDocuments.get(type.key); return { ...type, document: document ? { ...document, ...(document.storage?.publicId ? { viewUrl: storageProvider.signedUrl(document.storage.publicId, { resourceType: document.storage.resourceType, expiresInSeconds: 300 }) } : {}), storage: undefined } : null }; }) : [] });
}));

const documentDecisionSchema = z.object({ status: z.enum(['verified', 'rejected']), rejectionReason: z.string().trim().max(500).optional() }).superRefine((value, context) => { if (value.status === 'rejected' && (!value.rejectionReason || value.rejectionReason.length < 3)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['rejectionReason'], message: 'Enter why the document needs to be uploaded again.' }); });
dashboardRouter.patch('/admin/applications/:applicationId/documents/:documentId', requireRole(...ADMIN_ROLES), requireCsrf, validate(documentDecisionSchema), asyncHandler(async (request, response) => {
  const application = await Application.findOne({ _id: request.params.applicationId, customer: { $exists: true, $ne: null } }).select('_id applicationId');
  if (!application) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found.');
  const document = await ApplicationDocument.findOne({ _id: request.params.documentId, application: application._id });
  if (!document) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
  document.status = request.body.status; document.rejectionReason = request.body.status === 'rejected' ? request.body.rejectionReason : undefined; document.verifiedBy = request.user._id; document.verifiedAt = new Date(); await document.save();
  await AuditLog.create({ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: `application.document.${document.status}`, resourceType: 'ApplicationDocument', resourceId: document._id, newValues: { applicationId: application.applicationId, documentKey: document.documentKey, status: document.status }, reason: document.rejectionReason || 'Document reviewed', ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id });
  sendData(response, { id: document.id, status: document.status, rejectionReason: document.rejectionReason, verifiedAt: document.verifiedAt });
}));

dashboardRouter.get('/admin/applications/:applicationId/documents/:documentId/view', requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const application = await Application.findOne({ _id: request.params.applicationId, customer: { $exists: true, $ne: null } }).select('_id');
  if (!application) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found.');
  const document = await ApplicationDocument.findOne({ _id: request.params.documentId, application: application._id });
  if (!document?.storage?.publicId) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
  sendData(response, { url: storageProvider.signedUrl(document.storage.publicId, { resourceType: document.storage.resourceType, expiresInSeconds: 300 }), expiresInSeconds: 300 });
}));

const applicationStatusSchema = z.object({ status: z.enum(APPLICATION_STATUSES), publicNote: z.string().trim().min(5).max(1000), internalNote: z.string().trim().max(2000).optional(), reason: z.string().trim().min(3).max(500) });
dashboardRouter.patch('/admin/applications/:id/status', requireRole(...ADMIN_ROLES), requireCsrf, validate(applicationStatusSchema), asyncHandler(async (request, response) => {
  const application = await Application.findOne({ _id: request.params.id, customer: { $exists: true, $ne: null } }); if (!application) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found.'); const oldStatus = application.status;
  application.status = request.body.status; application.updatedBy = request.user._id; await application.save();
  await Promise.all([
    ApplicationStatusHistory.create({ application: application._id, oldStatus, newStatus: application.status, changedBy: request.user._id, changedByRole: request.user.roles[0]?.slug, publicNote: request.body.publicNote, internalNote: request.body.internalNote, reason: request.body.reason }),
    AuditLog.create({ actor: request.user._id, actorRoles: request.user.roles.map((role) => role.slug), action: 'application.status.updated', resourceType: 'Application', resourceId: application._id, oldValues: { status: oldStatus }, newValues: { status: application.status }, reason: request.body.reason, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }),
  ]);
  sendData(response, { id: application.id, applicationId: application.applicationId, status: application.status });
}));

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
