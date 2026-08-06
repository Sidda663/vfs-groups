import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Permission } from '../models/Permission.js';
import { Role } from '../models/Role.js';
import { Service } from '../models/Service.js';
import { ContentPage } from '../models/ContentPage.js';
import { Faq } from '../models/Faq.js';
import { SiteSettings } from '../models/SiteSettings.js';
import { Customer } from '../models/Customer.js';
import { Contractor } from '../models/Contractor.js';
import { LegalService } from '../models/LegalService.js';
import { User } from '../models/User.js';
import { syncInitialAdmin } from './initialAdmin.js';
import { contentPages, generalFaqs, permissions, roleDefinitions, services } from './referenceData.js';

const roleNames = { 'super-admin': 'Super Admin', admin: 'Admin', 'operations-manager': 'Operations Manager', 'application-manager': 'Application Manager', 'finance-manager': 'Finance Manager', 'support-agent': 'Support Agent', 'content-manager': 'Content Manager', contractor: 'Connector', customer: 'Customer' };
const verifiedBusinessSettings = {
  'contact.phone': '919008503115',
  'contact.phones': ['919008503115', '919008156084', '919880077987'],
  'contact.whatsapp': '919008156084',
  'contact.addressLines': ['No. 881/A, Yashodhara Complex', 'Dr. M. C. Modi Road, Shankarmutt Main Road', 'Basaveshwara Nagar'],
  'contact.city': 'Bengaluru',
  'contact.state': 'Karnataka',
  'contact.pinCode': '560079',
  'contact.locationNote': 'VFS GROUP, 3rd Floor',
  'contact.mapLatitude': '12.998319625854492',
  'contact.mapLongitude': '77.54251098632812',
  'legal.legalName': 'VFS GROUP',
  'legal.registrationNumber': '29ABBFV2204K1Z5',
  'legal.gstNumber': '29ABBFV2204K1Z5',
  'legal.regulatoryDisclosure': 'Regular GST registration valid from 23 December 2025. GST REG-06 certificate issued on 6 April 2026 in Karnataka.',
  'legal.providerRelationship': 'VFS GROUP provides financial-service assistance for products offered by banks, NBFCs, insurers and investment providers. Approval, pricing, issuance, cover, returns and final terms are decided by the relevant provider.',
};

async function seed() {
  await connectDatabase();
  const removedPermissions = await Permission.find({ key: { $in: ['payments.view', 'payments.manage', 'subscriptions.manage', 'commissions.approve', 'commissions.pay'] } }).select('_id');
  if (removedPermissions.length) {
    await Role.updateMany({}, { $pull: { permissions: { $in: removedPermissions.map((item) => item._id) } } });
    await Permission.deleteMany({ _id: { $in: removedPermissions.map((item) => item._id) } });
  }
  const permissionDocs = {};
  for (const [key, description] of permissions) permissionDocs[key] = await Permission.findOneAndUpdate({ key }, { $set: { description } }, { new: true, upsert: true });
  const roleDocs = {};
  for (const [slug, keys] of Object.entries(roleDefinitions)) roleDocs[slug] = await Role.findOneAndUpdate({ slug }, { $set: { name: roleNames[slug], permissions: keys.map((key) => permissionDocs[key]._id), isSystem: true } }, { new: true, upsert: true });
  let contractorIndexes = [];
  try { contractorIndexes = await Contractor.collection.indexes(); } catch (error) { if (error?.codeName !== 'NamespaceNotFound' && error?.code !== 26) throw error; }
  const referralIndex = contractorIndexes.find((index) => index.key?.referralCode === 1);
  if (referralIndex && !referralIndex.sparse) await Contractor.collection.dropIndex(referralIndex.name);
  await Contractor.collection.createIndex({ referralCode: 1 }, { unique: true, sparse: true, name: 'referralCode_1' });
  await User.updateMany({ roles: roleDocs.customer._id }, { $unset: { referralCode: '', referredBy: '', referredByCode: '' } });
  await Customer.updateMany({ customerType: { $exists: false } }, { $set: { customerType: 'indian' } });
  await Customer.updateMany({ referralApprovalStatus: { $exists: false } }, { $set: { referralApprovalStatus: 'none' } });
  const activeServiceSlugs = services.map((service) => service.slug);
  const archivedServices = await Service.updateMany({ slug: { $nin: activeServiceSlugs }, status: { $ne: 'archived' } }, { $set: { status: 'archived' } });
  for (const service of services) await Service.findOneAndUpdate({ slug: service.slug }, { $set: service }, { new: true, upsert: true, runValidators: true });
  await LegalService.findOneAndUpdate({ name: 'Lawyer' }, { $setOnInsert: { name: 'Lawyer', active: true } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  await SiteSettings.findOneAndUpdate({ key: 'public' }, { $set: verifiedBusinessSettings, $setOnInsert: { key: 'public' } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  for (const faq of generalFaqs) await Faq.findOneAndUpdate({ question: faq.question }, { $setOnInsert: faq }, { new: true, upsert: true, setDefaultsOnInsert: true });
  for (const page of contentPages) await ContentPage.findOneAndUpdate({ slug: page.slug }, { $setOnInsert: page }, { new: true, upsert: true, setDefaultsOnInsert: true });
  const initialAdmin = await syncInitialAdmin(env, roleDocs['super-admin']);
  console.info(`Seeded ${permissions.length} permissions, ${Object.keys(roleDefinitions).length} roles, ${services.length} services, Lawyer as the initial legal service, ${generalFaqs.length} FAQs, ${contentPages.length} content pages, archived ${archivedServices.modifiedCount} retired services, and admin status is ${initialAdmin.status}.`);
}

seed().then(disconnectDatabase).catch(async (error) => { console.error(error); await disconnectDatabase(); process.exit(1); });
