import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import HomePreview from './pages/HomePreview';
import About from './pages/About';
import Services from './pages/Services';
import Courses from './pages/courses/Courses';
import CourseDetail from './pages/courses/CourseDetail';
import Booking from './pages/Booking';
import Resources from './pages/Resources';
import Blog from './pages/blog/Blog';
import BlogPost from './pages/blog/BlogPost';
import Community from './pages/Community';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Shop from './pages/Shop';
import Privacy from './pages/legal/Privacy';
import Terms from './pages/legal/Terms';
import Cookies from './pages/legal/Cookies';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import AuthCallback from './pages/auth/AuthCallback';
import PendingApproval from './pages/auth/PendingApproval';
import Dashboard from './pages/dashboard/Dashboard';
import MyCourses from './pages/dashboard/MyCourses';
import ProfileSettings from './pages/dashboard/ProfileSettings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminMessages from './pages/admin/AdminMessages';
import AdminCourses from './pages/admin/AdminCourses';
import AdminBlog from './pages/admin/AdminBlog';
import AdminBookings from './pages/admin/AdminBookings';
import AdminOrders from './pages/admin/AdminOrders';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppShell() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <ScrollToTop />
      {isAdminRoute ? null : <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home-preview" element={<HomePreview />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogPost />} />
          <Route path="/community" element={<Community />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/verify-email" element={<VerifyEmail />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/pending-approval" element={<PendingApproval />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/messages" element={<ProtectedRoute requiredRole="admin"><AdminMessages /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute requiredRole="admin"><AdminCourses /></ProtectedRoute>} />
          <Route path="/admin/blog" element={<ProtectedRoute requiredRole="admin"><AdminBlog /></ProtectedRoute>} />
          <Route path="/admin/bookings" element={<ProtectedRoute requiredRole="admin"><AdminBookings /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute requiredRole="admin"><AdminOrders /></ProtectedRoute>} />
        </Routes>
      </main>
      {isAdminRoute ? null : <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
