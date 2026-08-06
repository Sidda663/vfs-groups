export const organizationSchema = (settings) => ({
  '@context': 'https://schema.org', '@type': 'FinancialService', name: settings?.legal?.legalName || 'VFS Groups',
  url: import.meta.env.VITE_APP_URL || 'http://localhost:5173', logo: `${import.meta.env.VITE_APP_URL || 'http://localhost:5173'}/brand/vfs-groups-logo.png`,
  telephone: settings?.contact?.phone ? `+${settings.contact.phone.replace(/\D/g, '')}` : undefined,
  email: settings?.contact?.email || undefined,
  address: settings?.contact?.city ? { '@type': 'PostalAddress', streetAddress: settings.contact.addressLines?.join(', '), addressLocality: settings.contact.city, addressRegion: settings.contact.state, postalCode: settings.contact.pinCode, addressCountry: 'IN' } : undefined,
});
