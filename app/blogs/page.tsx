"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../firebase/firebaseConfig"; // Import the Firestore instance
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Link from "next/link"; // Import Link for navigation
import { FaUserCircle } from "react-icons/fa"; // Import user icon
import "./Blogs.css"; // Import the CSS file

const Blogs = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const auth = getAuth();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (user) {
      const fetchBlogs = async () => {
        try {
          const q = query(collection(db, "blogs"), where("userId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const fetchedBlogs: any[] = [];
          querySnapshot.forEach((doc) => {
            fetchedBlogs.push({ ...doc.data(), id: doc.id });
          });
          console.log("Fetched blogs from Firestore:", fetchedBlogs); // Debugging log
          setBlogs(fetchedBlogs);
        } catch (error) {
          console.error("Error fetching blogs:", error);
        }
      };

      fetchBlogs();
    }
  }, [user]);

  const handleBlogClick = (id: string) => {
    router.push(`/blogs/${id}`);
  };

  const handleHomeClick = () => {
    if (user) {
      // Redirect to the text editor if the user is logged in
      router.push("/text-editor");
    } else {
      // Redirect to login page if the user is not logged in
      router.push("/login");
    }
  };

  return (
    <div className="main-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">BLOG FUSION</div>
        <ul className="navbar-links">
          <li>
            <button onClick={handleHomeClick} className="nav-link">
              Home
            </button>
          </li>
          <li>
            <Link href="#about" className="nav-link">
              About
            </Link>
          </li>
          <li>
            <Link href="#services" className="nav-link">
              Services
            </Link>
          </li>
          <li>
            <Link href="/blogfeed" className="nav-link">
              Blog Feed
            </Link>
          </li>
        </ul>
        {/* User Icon and Name */}
        {user ? (
          <div className="user-info">
            <FaUserCircle size={24} />
            <span className="user-name">{user.displayName || "User"}</span>
          </div>
        ) : (
          <Link href="/login" className="login-button">
            Login
          </Link>
        )}
      </nav>

      {/* Blog List */}
      <h1 className="page-title">My Blogs</h1>
      <div className="blogs-container">
        {blogs.length === 0 ? (
          <p className="no-blogs">No blogs found</p>
        ) : (
          blogs.map((blog) => (
            <div key={blog.id} className="blog-card">
              <h2 className="blog-title">{blog.title}</h2>
              <p className="blog-category">
                <strong>Category:</strong> {blog.category}
              </p>
              <div className="blog-description">
                <p>{blog.metaDescription}</p>
                <button
                  onClick={() => handleBlogClick(blog.id)}
                  className="read-more-button"
                >
                  Read More
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Section */}
      <footer className="footer">
        <div className="footer-content">
          <p className="footer-text">&copy; 2025 Blog Fusion. All Rights Reserved.</p>
          <div className="footer-links">
            <Link href="#" className="footer-link">
              Privacy Policy
            </Link>
            <Link href="#" className="footer-link">
              Terms of Service
            </Link>
            <Link href="#" className="footer-link">
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Blogs;


