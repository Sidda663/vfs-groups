import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'public' },
  contact: {
    phone: { type: String, trim: true, default: '919008503115' },
    phones: { type: [String], default: ['919008503115', '919008156084', '919880077987'] },
    whatsapp: { type: String, trim: true, default: '919008156084' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    addressLines: { type: [String], default: ['No. 881/A, Yashodhara Complex', 'Dr. M. C. Modi Road, Shankarmutt Main Road', 'Basaveshwara Nagar'] },
    city: { type: String, trim: true, default: 'Bengaluru' },
    state: { type: String, trim: true, default: 'Karnataka' },
    pinCode: { type: String, trim: true, default: '560079' },
    locationNote: { type: String, trim: true, default: 'VFS GROUP, 3rd Floor' },
    mapLatitude: { type: String, trim: true, default: '12.998319625854492' },
    mapLongitude: { type: String, trim: true, default: '77.54251098632812' },
    officeHours: { type: String, trim: true, default: '' },
  },
  legal: {
    legalName: { type: String, trim: true, default: 'VFS GROUP' },
    registrationNumber: { type: String, trim: true, default: '29ABBFV2204K1Z5' },
    gstNumber: { type: String, trim: true, default: '29ABBFV2204K1Z5' },
    regulatoryDisclosure: { type: String, trim: true, default: 'Regular GST registration valid from 23 December 2025. GST REG-06 certificate issued on 6 April 2026 in Karnataka.' },
    providerRelationship: { type: String, trim: true, default: 'VFS GROUP provides financial-service assistance for products offered by banks, NBFCs, insurers and investment providers. Approval, pricing, issuance, cover, returns and final terms are decided by the relevant provider.' },
  },
  cashback: {
    enabled: { type: Boolean, default: false },
    terms: { type: String, trim: true, default: '' },
  },
  social: {
    facebook: { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    youtube: { type: String, trim: true, default: '' },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const SiteSettings = mongoose.model('SiteSettings', schema);
