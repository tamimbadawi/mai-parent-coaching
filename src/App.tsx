import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Booking from './pages/Booking';
import Resources from './pages/Resources';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Community from './pages/Community';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Shop from './pages/Shop';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import AuthCallback from './pages/auth/AuthCallback';
import Dashboard from './pages/dashboard/Dashboard';
import MyCourses from './pages/dashboard/MyCourses';
import ProfileSettings from './pages/dashboard/ProfileSettings';
import { ThemeSwitcher } from './theme.tsx';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-ivory">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
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
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
              <Route path="/dashboard/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
          <ThemeSwitcher />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
