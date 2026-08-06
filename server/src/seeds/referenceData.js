export const permissions = [
  ['customers.view', 'View authorized customer records'], ['customers.edit', 'Edit authorized customer records'], ['customers.suspend', 'Suspend customer accounts'],
  ['contractors.view', 'View connector records'], ['contractors.approve', 'Approve or reject connectors'], ['contractors.suspend', 'Suspend connector accounts'],
  ['applications.view', 'View authorized applications'], ['applications.create', 'Create applications'], ['applications.assign', 'Assign applications'], ['applications.status.update', 'Change application status'],
  ['subscriptions.view', 'View disabled subscription records'],
  ['commissions.view', 'View disabled commission records'],
  ['support.view', 'View support tickets'], ['support.manage', 'Manage support tickets'], ['content.manage', 'Manage CMS content'], ['content.publish', 'Publish CMS content'],
  ['reports.view', 'View reports'], ['reports.export', 'Export reports'], ['settings.manage', 'Manage system settings'], ['roles.manage', 'Manage roles and permissions'], ['audit.view', 'View immutable audit records'],
];

export const roleDefinitions = {
  'super-admin': permissions.map(([key]) => key),
  admin: permissions.map(([key]) => key).filter((key) => key !== 'roles.manage'),
  'operations-manager': ['customers.view', 'customers.edit', 'contractors.view', 'contractors.approve', 'applications.view', 'applications.create', 'applications.assign', 'applications.status.update', 'support.view', 'reports.view', 'reports.export'],
  'application-manager': ['customers.view', 'contractors.view', 'applications.view', 'applications.create', 'applications.assign', 'applications.status.update', 'reports.view'],
  'finance-manager': ['customers.view', 'contractors.view', 'applications.view', 'subscriptions.view', 'commissions.view', 'reports.view', 'reports.export'],
  'support-agent': ['customers.view', 'contractors.view', 'applications.view', 'support.view', 'support.manage'],
  'content-manager': ['content.manage', 'content.publish'],
  contractor: ['customers.view', 'applications.view', 'applications.create', 'subscriptions.view', 'commissions.view', 'support.view', 'reports.view'],
  customer: ['applications.view', 'applications.create', 'subscriptions.view', 'support.view'],
};

const assistanceProcess = [
  'Share your requirement with VFS Groups',
  'Provide the information currently available to you',
  'Receive guidance and bring requested documents during in-person coordination',
  'VFS Groups coordinates the application with an appropriate provider',
  'Track progress and respond to provider requests',
];

const loanEligibility = [
  'Assistance is available for salaried and self-employed applicants',
  'You can approach VFS Groups with ITRs or without ITRs',
  'A low or limited CIBIL score does not prevent you from requesting assistance',
  'VFS Groups reviews the available profile and documents before suggesting the next step',
  'Final eligibility, pricing, tenure, approval, and disbursement are decided by the relevant lender',
];

const loanFeatures = ['Quick processing support', 'Minimum-documentation guidance', 'Competitive options from relevant providers', 'Expert financial guidance', 'Digital and paperless assistance'];
const insuranceEligibility = ['Available to salaried and self-employed customers', 'Product suitability, premium, cover, and acceptance depend on the selected insurer and official policy terms'];
const investmentEligibility = ['Available to salaried and self-employed customers seeking guided investment options', 'Product eligibility, risk, returns, lock-ins, and taxation depend on the selected product and provider'];
const standardConsiderations = ['Cashback applies only to eligible services and is subject to the applicable offer terms', 'Read all provider terms, charges, risks, exclusions, and conditions before proceeding'];
const loanFaqs = [
  { question: 'Can I contact VFS Groups without ITRs?', answer: 'Yes. VFS Groups assists salaried and self-employed applicants with or without ITRs and will review the documents currently available.' },
  { question: 'Can I apply if my CIBIL score is low?', answer: 'Yes, you can still request assistance. VFS Groups will review the profile and discuss possible next steps, but the relevant lender makes the final decision.' },
  { question: 'Is loan approval guaranteed?', answer: 'No. Approval, amount, rate, tenure, charges, and disbursement are decided by the relevant lender after its assessment.' },
];
const providerFaqs = [
  { question: 'Will VFS Groups help me choose an option?', answer: 'Yes. The team can understand your requirement, explain available options, and guide you through the application process.' },
  { question: 'Are benefits or returns guaranteed?', answer: 'No. Benefits, cover, premiums, returns, risks, and acceptance are governed by the selected provider and official product terms.' },
];

const loan = (service) => ({
  category: 'Loans', features: loanFeatures, suitableFor: ['Salaried customers', 'Self-employed customers', 'Applicants with or without ITRs', 'Applicants with a low or limited CIBIL score'],
  eligibility: loanEligibility, process: assistanceProcess, considerations: standardConsiderations, faqs: loanFaqs, ...service,
});
const insurance = (service) => ({
  category: 'Insurance', features: ['Guided product selection', 'Digital application assistance', 'Minimum-documentation guidance', 'Expert support'], suitableFor: ['Salaried customers', 'Self-employed customers', 'Individuals, families, and businesses as applicable'],
  eligibility: insuranceEligibility, process: assistanceProcess, considerations: standardConsiderations, faqs: providerFaqs, ...service,
});
const investment = (service) => ({
  category: 'Wealth & Investments', features: ['Personalized financial guidance', 'Digital onboarding assistance', 'Investment diversification support', 'Ongoing service coordination'], suitableFor: ['Salaried customers', 'Self-employed customers', 'Customers planning short- or long-term financial goals'],
  eligibility: investmentEligibility, process: assistanceProcess, considerations: standardConsiderations, faqs: providerFaqs, ...service,
});

export const services = [
  loan({ name: 'Personal Loans', slug: 'personal-loans', shortDescription: 'Personal funding assistance for salaried and self-employed customers.', overview: 'Get guided personal loan assistance even when you do not have ITRs or your CIBIL score is low. VFS Groups reviews the available profile and helps identify a suitable next step.', useCases: ['Personal financial requirements', 'Planned purchases or expenses', 'Consolidating eligible obligations'], documents: ['Identity and address proof', 'Available salary, income, or business records', 'Recent bank statements when available', 'Existing loan details when applicable'], relatedSlugs: ['business-loans', 'education-loans'] }),
  loan({ name: 'Business Loans', slug: 'business-loans', shortDescription: 'Funding assistance for self-employed customers, entrepreneurs, and businesses.', overview: 'VFS Groups supports business funding requirements using the information and documents available with the applicant, including profiles with or without ITRs.', useCases: ['Business expansion', 'Inventory or equipment', 'Operational requirements'], documents: ['Identity and address proof', 'Available business registration or activity records', 'Available bank statements, GST records, or ITRs', 'Requirement details'], relatedSlugs: ['working-capital-finance', 'loan-against-property'] }),
  loan({ name: 'Home Loans', slug: 'home-loans', shortDescription: 'Home finance assistance for eligible property purchase requirements.', overview: 'Receive guidance through the home loan journey, from understanding the requirement and available documents to coordination with a relevant lender.', useCases: ['New home purchase', 'Resale home purchase', 'Other eligible residential purchase requirements'], documents: ['Identity and address proof', 'Available income or business records', 'Bank statements when available', 'Property documents'], relatedSlugs: ['loan-against-property', 'personal-loans'] }),
  loan({ name: 'Loan Against Property (LAP)', slug: 'loan-against-property', shortDescription: 'Property-backed loan assistance for personal or business requirements.', overview: 'Explore finance against eligible property with support for profile review, document guidance, and lender coordination.', useCases: ['Business funding', 'Eligible personal financial requirements', 'Working-capital support'], documents: ['Identity and address proof', 'Available income or business records', 'Property ownership documents', 'Bank statements when available'], relatedSlugs: ['home-loans', 'working-capital-finance'] }),
  loan({ name: 'New & Used Car Loans', slug: 'new-used-car-loans', shortDescription: 'Finance assistance for eligible new and pre-owned car purchases.', overview: 'Get support comparing the application route for a new or used car and coordinating the required information with a relevant lender.', useCases: ['New car purchase', 'Used car purchase'], documents: ['Identity and address proof', 'Available income or business records', 'Bank statements when available', 'Vehicle quotation or purchase details'], relatedSlugs: ['motor-insurance', 'personal-loans'] }),
  loan({ name: 'Education Loans', slug: 'education-loans', shortDescription: 'Education finance guidance for eligible study-related requirements.', overview: 'VFS Groups helps families and students organize the available course, institution, cost, and applicant information for lender review.', useCases: ['Tuition and eligible education costs', 'Domestic or overseas study requirements'], documents: ['Identity and address proof', 'Admission or course information', 'Available academic and cost records', 'Applicant or co-applicant financial information'], relatedSlugs: ['personal-loans', 'home-loans'] }),
  loan({ name: 'Loan Against Shares', slug: 'loan-against-shares', shortDescription: 'Funding assistance against eligible shareholdings and investments.', overview: 'Explore a secured funding route against eligible shares or investments, subject to provider rules and valuation.', useCases: ['Eligible personal liquidity needs', 'Eligible business liquidity needs'], documents: ['Identity and address proof', 'Holding or demat statements', 'Available income or business records', 'Bank statements when available'], relatedSlugs: ['working-capital-finance', 'lump-sum-investments'] }),
  loan({ name: 'Working Capital Finance', slug: 'working-capital-finance', shortDescription: 'Finance assistance for day-to-day business cash-flow requirements.', overview: 'VFS Groups helps self-employed customers and businesses present their working-capital requirement using the records currently available.', useCases: ['Inventory purchases', 'Supplier or operating requirements', 'Short-term business cash flow'], documents: ['Identity and address proof', 'Available business activity records', 'Available bank statements, GST records, or ITRs', 'Working-capital requirement details'], relatedSlugs: ['business-loans', 'loan-against-property'] }),
  insurance({ name: 'Health Insurance', slug: 'health-insurance', shortDescription: 'Guidance for health insurance options for individuals and families.', overview: 'Understand available health cover options, key policy terms, disclosures, and the steps needed to apply with a selected insurer.', useCases: ['Individual health cover', 'Family health cover', 'Policy renewal assistance'], documents: ['Identity and age details', 'Member information', 'Existing policy details for renewal', 'Medical information requested by the insurer'], relatedSlugs: ['life-insurance', 'general-insurance'] }),
  insurance({ name: 'Life Insurance', slug: 'life-insurance', shortDescription: 'Guidance for life-protection options and long-term financial security.', overview: 'Discuss life insurance requirements and receive application guidance based on the selected insurer and policy.', useCases: ['Life protection planning', 'Family financial security', 'Policy review or renewal support'], documents: ['Identity and age proof', 'Nominee details', 'Income information if requested', 'Medical information requested by the insurer'], relatedSlugs: ['health-insurance', 'corporate-fixed-deposits'] }),
  insurance({ name: 'Motor Insurance', slug: 'motor-insurance', shortDescription: 'Insurance assistance for cars, two-wheelers, and eligible vehicles.', overview: 'Get help with new motor insurance or renewal while reviewing available cover, add-ons, and official policy terms.', useCases: ['New vehicle cover', 'Policy renewal', 'Eligible add-on review'], documents: ['Vehicle registration details', 'Existing policy for renewal', 'Identity and contact details', 'Claim information if applicable'], relatedSlugs: ['new-used-car-loans', 'general-insurance'] }),
  insurance({ name: 'General Insurance', slug: 'general-insurance', shortDescription: 'Guidance across eligible non-life insurance requirements.', overview: 'Explore general insurance options suited to the stated requirement with support understanding documents and policy terms.', useCases: ['Eligible personal asset protection', 'Travel or other non-life requirements', 'Business-related protection as applicable'], documents: ['Identity and contact details', 'Details of the asset or risk to be covered', 'Existing policy information when applicable'], relatedSlugs: ['motor-insurance', 'warehouse-commercial-insurance'] }),
  insurance({ name: 'Warehouse & Commercial Insurance', slug: 'warehouse-commercial-insurance', shortDescription: 'Insurance guidance for eligible warehouses and commercial requirements.', overview: 'Get assistance presenting a warehouse or commercial insurance requirement and understanding the selected policy terms.', useCases: ['Warehouse protection', 'Commercial property protection', 'Eligible business-risk cover'], documents: ['Business and property details', 'Asset or stock information', 'Existing policy details when applicable', 'Risk information requested by the insurer'], relatedSlugs: ['general-insurance', 'working-capital-finance'] }),
  investment({ name: 'Corporate Fixed Deposits', slug: 'corporate-fixed-deposits', shortDescription: 'Guidance while exploring eligible corporate fixed-deposit options.', overview: 'Review corporate fixed-deposit options with attention to provider information, tenure, payout structure, risk, and applicable terms.', useCases: ['Planned fixed-term investment', 'Income or maturity planning'], documents: ['Identity and address proof', 'PAN and bank details', 'Nominee details', 'Additional KYC requested by the provider'], relatedSlugs: ['sip-investments', 'lump-sum-investments'] }),
  investment({ name: 'SIP (Systematic Investment Plans)', slug: 'sip-investments', shortDescription: 'Guidance for disciplined, periodic investment planning.', overview: 'Build a systematic investment approach around your goals, time horizon, and risk understanding with digital onboarding support.', useCases: ['Periodic investing', 'Long-term goal planning', 'Investment diversification'], documents: ['Identity and address proof', 'PAN and bank details', 'Nominee details', 'Additional KYC requested by the provider'], relatedSlugs: ['lump-sum-investments', 'corporate-fixed-deposits'] }),
  investment({ name: 'Lump Sum Investments', slug: 'lump-sum-investments', shortDescription: 'Guidance for investing a planned amount through suitable options.', overview: 'Discuss a one-time investment requirement and understand diversification, product risk, time horizon, and official terms before proceeding.', useCases: ['One-time investment', 'Portfolio diversification', 'Goal-based investment planning'], documents: ['Identity and address proof', 'PAN and bank details', 'Nominee details', 'Additional KYC requested by the provider'], relatedSlugs: ['sip-investments', 'corporate-fixed-deposits'] }),
  { name: 'Legal Services', slug: 'legal-services', category: 'Legal Services', shortDescription: 'Professional legal-service assistance based on your selected requirement.', overview: 'Choose an available legal service and share your contact details. VFS Groups will review the request and coordinate the next step.', features: ['Clear communication', 'Dedicated customer service', 'Secure personal information handling', 'Physical presence service'], suitableFor: ['Indian customers', 'NRI customers', 'Individuals and businesses seeking legal assistance'], useCases: ['Lawyer consultation', 'Legal guidance and service coordination'], eligibility: ['Available to customers who provide valid contact details'], documents: ['Documents relevant to the legal requirement, when requested'], process: ['Choose the required legal service', 'Submit your contact details', 'Receive a call from the VFS Groups team', 'Coordinate the next step with the relevant professional'], considerations: ['Service availability depends on the selected legal category and professional'], faqs: [], relatedSlugs: [] },
].map((service, index) => ({ ...service, status: 'published', sortOrder: index + 1, seo: { title: `${service.name} | VFS Groups`, description: service.shortDescription } }));

export const generalFaqs = [
  ['Loans', 'Can I request loan assistance without ITRs?', 'Yes. VFS Groups accepts requests from salaried and self-employed customers with or without ITRs and reviews the information currently available. The relevant lender decides final eligibility and terms.'],
  ['Loans', 'Can I contact VFS Groups with a low CIBIL score?', 'Yes. A low or limited CIBIL score does not prevent you from requesting assistance. No approval is guaranteed, and the relevant lender makes the final decision.'],
  ['Applications', 'How do I check my application status?', 'Use your application ID and registered mobile number on the Track Application page. A short-lived verification code is required before status information is shown.'],
  ['Applications', 'Can I save an application and finish it later?', 'Yes. Guests can keep a 30-day draft on the same device. Signed-in customers can save a 30-day draft to their customer account and continue it from another device.'],
  ['Documents', 'How do I provide documents?', 'Indian Customers receive document guidance from the VFS team. NRI Customers can securely upload requested documents from their signed-in Customer dashboard after submitting an application.'],
  ['Security', 'How does VFS Groups protect application access?', 'Portal sessions use secure access. NRI documents are stored privately and are available to authorized administrators through short-lived signed links.'],
  ['Services', 'Does VFS Groups guarantee approval, rates, cover, or returns?', 'No. VFS Groups provides application assistance and guidance. Approval, pricing, issuance, cover, returns, and final terms are controlled by the relevant provider.'],
  ['Cashback', 'Is cashback available on every service?', 'No. Cashback is available only when a specific eligible offer and its terms have been published by VFS Groups.'],
].map(([category, question, answer], index) => ({ category, question, answer, status: 'published', sortOrder: index + 1 }));

export const contentPages = [
  {
    slug: 'privacy', eyebrow: 'Legal', title: 'Privacy notice', status: 'published',
    summary: 'This notice explains how VFS Groups handles information submitted through this website and its authenticated portals.',
    seo: { title: 'Privacy Notice | VFS Groups', description: 'How VFS Groups collects, uses, stores, and protects website and application information.' },
    sections: [
      { heading: 'Information collected', body: 'Depending on the service used, VFS Groups may collect contact details, identity and profile information, financial requirement details, application records, consent records, referral attribution, login activity, device information, support messages, and documents securely uploaded by NRI Customers for their applications.', bullets: [] },
      { heading: 'Why information is used', body: 'Information is used to respond to enquiries, provide application assistance, coordinate with an appropriate provider when authorized, operate secure portals, prevent abuse, maintain audit records, improve the service, and comply with applicable obligations.', bullets: [] },
      { heading: 'Sharing and providers', body: 'Information is shared only with authorized staff, contracted technology providers, and relevant financial-service providers when necessary for the requested service or when required by law. VFS Groups does not publish customer details or testimonials without confirmation of permission.', bullets: [] },
      { heading: 'Retention and security', body: 'Records are retained only for operational, legal, security, and audit needs. Website controls include role-based access, secure cookies, verification challenges, encrypted transport, and activity logging. No online system can promise absolute security.', bullets: [] },
      { heading: 'Your choices', body: 'You may ask VFS Groups to correct inaccurate information, withdraw optional communication consent, or raise a privacy request through the official contact form. Some records may need to be retained where legally or operationally required.', bullets: [] },
    ],
  },
  {
    slug: 'terms', eyebrow: 'Legal', title: 'Website and service terms', status: 'published',
    summary: 'These terms govern use of the VFS Groups website, enquiry forms, application assistance, referral tools, and authenticated portals.',
    seo: { title: 'Terms and Conditions | VFS Groups', description: 'Terms governing use of VFS Groups website and financial-service assistance tools.' },
    sections: [
      { heading: 'Nature of the service', body: 'VFS Groups helps customers understand options, organize information, and coordinate applications. VFS Groups is not promising approval, disbursement, policy issuance, investment performance, a particular rate, or a particular provider outcome.', bullets: [] },
      { heading: 'Accurate information', body: 'You must provide information that is accurate to the best of your knowledge, protect access codes and portal credentials, and notify VFS Groups if submitted information changes.', bullets: [] },
      { heading: 'Provider terms', body: 'Any loan, insurance, deposit, investment, or other financial product is governed by the documents, eligibility rules, pricing, risk disclosures, and final decision of the relevant provider.', bullets: [] },
      { heading: 'Acceptable use', body: 'Do not submit unlawful content, another person’s information without authority, malicious files, automated abuse, or attempts to bypass access controls. Access may be restricted to protect customers and the platform.', bullets: [] },
      { heading: 'Updates and contact', body: 'These terms may be updated as services and legal requirements change. The current published version applies from its displayed update date. Questions can be raised using the official contact form.', bullets: [] },
    ],
  },
  {
    slug: 'disclaimer', eyebrow: 'Important information', title: 'Financial services disclaimer', status: 'published',
    summary: 'Read this information before relying on service descriptions, calculators, provider information, or application guidance.',
    seo: { title: 'Financial Services Disclaimer | VFS Groups', description: 'Important limitations concerning VFS Groups financial-service assistance and website tools.' },
    sections: [
      { heading: 'No guaranteed outcome', body: 'Approval, loan amount, interest rate, tenure, charges, disbursement, insurance acceptance, premium, cover, claims, deposit terms, investment risk, and returns are decided under the relevant provider’s official terms. Past or illustrative information does not guarantee a future result.', bullets: [] },
      { heading: 'Illustrative tools', body: 'EMI calculations and other planning outputs are estimates based on the inputs supplied. Actual repayment schedules, fees, taxes, and provider calculations may differ.', bullets: [] },
      { heading: 'Independent review', body: 'Read official product documents and risk disclosures and obtain professional advice where appropriate before accepting a financial product. Never send money or sensitive credentials to an unverified person.', bullets: [] },
      { heading: 'Cashback and rewards', body: 'A cashback or reward applies only when VFS Groups has published a specific eligible offer and the customer satisfies all stated conditions. No general cashback entitlement is created by website wording.', bullets: [] },
    ],
  },
];
