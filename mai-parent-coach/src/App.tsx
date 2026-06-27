import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import { supabase } from './lib/supabase';
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
import Login from './pages/Login';
import Shop from './pages/Shop';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';

function App() {
  const [todos, setTodos] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    const loadTodos = async () => {
      const { data, error } = await supabase.from('todos').select('id, name');

      if (!error && data) {
        setTodos(data as Array<{ id: number; name: string }>);
      }
    };

    loadTodos();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <main>
          <section className="mx-auto max-w-6xl px-6 py-4">
            <h2 className="text-xl font-semibold">Supabase demo</h2>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              {todos.map((todo) => (
                <li key={todo.id}>{todo.name}</li>
              ))}
            </ul>
          </section>
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
            <Route path="/login" element={<Login />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
