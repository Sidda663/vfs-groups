import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { BrandedLoader } from '../components/BrandedLoader.jsx';
import { ProtectedRoute } from '../components/ProtectedRoute.jsx';
import { RouteErrorPage } from '../components/RouteErrorPage.jsx';
import { SiteLayout } from '../components/SiteLayout.jsx';
import { SimpleContentPage } from '../pages/SimpleContentPage.jsx';

const HomePage = lazy(() => import('../pages/HomePage.jsx').then((module) => ({ default: module.HomePage })));
const ServicesPage = lazy(() => import('../pages/ServicesPage.jsx').then((module) => ({ default: module.ServicesPage })));
const ServiceDetailPage = lazy(() => import('../pages/ServiceDetailPage.jsx').then((module) => ({ default: module.ServiceDetailPage })));
const AboutPage = lazy(() => import('../pages/AboutPage.jsx').then((module) => ({ default: module.AboutPage })));
const EmiCalculatorPage = lazy(() => import('../pages/EmiCalculatorPage.jsx').then((module) => ({ default: module.EmiCalculatorPage })));
const ContactPage = lazy(() => import('../pages/ContactPage.jsx').then((module) => ({ default: module.ContactPage })));
const PortalChoicePage = lazy(() => import('../pages/PortalChoicePage.jsx').then((module) => ({ default: module.PortalChoicePage })));
const PortalLoginPage = lazy(() => import('../pages/PortalLoginPage.jsx').then((module) => ({ default: module.PortalLoginPage })));
const AccountRegisterPage = lazy(() => import('../pages/AccountRegisterPage.jsx').then((module) => ({ default: module.AccountRegisterPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx').then((module) => ({ default: module.NotFoundPage })));
const ApplyPage = lazy(() => import('../pages/ApplyPage.jsx').then((module) => ({ default: module.ApplyPage })));
const GalleryPage = lazy(() => import('../pages/GalleryPage.jsx').then((module) => ({ default: module.GalleryPage })));
const FaqPage = lazy(() => import('../pages/FaqPage.jsx').then((module) => ({ default: module.FaqPage })));
const PartnerPage = lazy(() => import('../pages/PartnerPage.jsx').then((module) => ({ default: module.PartnerPage })));
const LegalPage = lazy(() => import('../pages/LegalPage.jsx').then((module) => ({ default: module.LegalPage })));
const CustomerDashboardPage = lazy(() => import('../pages/dashboards/MemberDashboardPage.jsx').then((module) => ({ default: module.CustomerDashboardPage })));
const ContractorDashboardPage = lazy(() => import('../pages/dashboards/MemberDashboardPage.jsx').then((module) => ({ default: module.ContractorDashboardPage })));
const AdminDashboardPage = lazy(() => import('../pages/dashboards/AdminDashboardPage.jsx').then((module) => ({ default: module.AdminDashboardPage })));
const AdminUserDetailPage = lazy(() => import('../pages/dashboards/AdminUserDetailPage.jsx').then((module) => ({ default: module.AdminUserDetailPage })));
const AdminReferralDetailPage = lazy(() => import('../pages/dashboards/AdminReferralDetailPage.jsx').then((module) => ({ default: module.AdminReferralDetailPage })));
const AdminContentPage = lazy(() => import('../pages/dashboards/AdminContentPage.jsx').then((module) => ({ default: module.AdminContentPage })));
const AdminApplicationsPage = lazy(() => import('../pages/dashboards/AdminApplicationsPage.jsx').then((module) => ({ default: module.AdminApplicationsPage })));
const AdminLegalServicesPage = lazy(() => import('../pages/dashboards/AdminLegalServicesPage.jsx').then((module) => ({ default: module.AdminLegalServicesPage })));
const AdminPaymentsPage = lazy(() => import('../pages/dashboards/AdminPaymentsPage.jsx').then((module) => ({ default: module.AdminPaymentsPage })));
const route = (element) => <Suspense fallback={<BrandedLoader/>}>{element}</Suspense>;
const adminRoles=['super-admin','admin','operations-manager','application-manager','finance-manager','support-agent','content-manager'];

export const router = createBrowserRouter([{
  path: '/', element: <SiteLayout />, errorElement: <RouteErrorPage/>, children: [
    { index: true, element: route(<HomePage />) }, { path: 'services', element: route(<ServicesPage />) }, { path: 'services/:slug', element: route(<ServiceDetailPage />) },
    { path: 'emi-calculator', element: route(<EmiCalculatorPage />) }, { path: 'contact', element: route(<ContactPage />) },
    { path: 'sign-in', element: route(<PortalChoicePage />) },
    { path: 'customer/sign-in', element: route(<PortalLoginPage portal="customer" />) }, { path: 'contractor/sign-in', element: route(<PortalLoginPage portal="contractor" />) }, { path: 'admin/sign-in', element: route(<PortalLoginPage portal="admin" />) },
    { path: 'customer/sign-up', element: route(<AccountRegisterPage accountType="customer" />) }, { path: 'contractor/sign-up', element: route(<AccountRegisterPage accountType="contractor" />) },
    { path: 'about', element: route(<AboutPage />) },
    { path: 'partner', element: route(<PartnerPage />) },
    { path: 'legal-services', element: <Navigate to="/services/legal-services" replace/> },
    { path: 'apply', element: route(<ProtectedRoute allowedRoles={['customer']}><ApplyPage /></ProtectedRoute>) },
    { path: 'track', element: route(<ProtectedRoute allowedRoles={['customer']}><Navigate to="/customer/dashboard" replace/></ProtectedRoute>) },
    { path: 'eligibility', element: <SimpleContentPage title="Start with your requirement—not a rigid checklist" eyebrow="Inclusive loan assistance" copy="VFS Group assists salaried and self-employed customers with or without ITRs, including customers with a low or limited CIBIL score. Share the information available to you and our team will guide the next step. Final approval and terms are decided by the relevant lender." /> },
    { path: 'gallery', element: route(<GalleryPage />) },
    { path: 'faqs', element: route(<FaqPage />) },
    { path: 'privacy', element: route(<LegalPage slug="privacy" />) },
    { path: 'terms', element: route(<LegalPage slug="terms" />) },
    { path: 'disclaimer', element: route(<LegalPage slug="disclaimer" />) },
    { path: '*', element: route(<NotFoundPage />) },
  ],
},
{ path:'/customer/dashboard',errorElement:<RouteErrorPage/>,element:route(<ProtectedRoute allowedRoles={['customer']}><CustomerDashboardPage/></ProtectedRoute>) },
{ path:'/contractor/dashboard',errorElement:<RouteErrorPage/>,element:route(<ProtectedRoute allowedRoles={['contractor']}><ContractorDashboardPage/></ProtectedRoute>) },
{ path:'/admin/dashboard',errorElement:<RouteErrorPage/>,element:route(<ProtectedRoute allowedRoles={adminRoles}><AdminDashboardPage/></ProtectedRoute>) },
{ path:'/admin/users/:id',errorElement:<RouteErrorPage/>,element:route(<ProtectedRoute allowedRoles={adminRoles}><AdminUserDetailPage/></ProtectedRoute>) },
{ path:'/admin/referrals/:code',errorElement:<RouteErrorPage/>,element:route(<ProtectedRoute allowedRoles={adminRoles}><AdminReferralDetailPage/></ProtectedRoute>) },
{ path:'/admin/applications',errorElement:<RouteErrorPage/>,element:route(<ProtectedRoute allowedRoles={adminRoles}><AdminApplicationsPage/></ProtectedRoute>) },
{ path:'/admin/content',errorElement:<RouteErrorPage/>,element:route(<ProtectedRoute allowedRoles={adminRoles}><AdminContentPage/></ProtectedRoute>) },
{ path:'/admin/legal-services',errorElement:<RouteErrorPage/>,element:route(<ProtectedRoute allowedRoles={adminRoles}><AdminLegalServicesPage/></ProtectedRoute>) },
{ path:'/admin/payments',errorElement:<RouteErrorPage/>,element:route(<ProtectedRoute allowedRoles={adminRoles}><AdminPaymentsPage/></ProtectedRoute>) },
]);
