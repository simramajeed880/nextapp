"use client";
import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig"; // Import the Firestore instance
import { doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth"; // Import Firebase auth methods
import Link from "next/link"; // Make sure this is imported
import { FaUserCircle } from "react-icons/fa"; // Import the user icon from react-icons
import "./Blogs.css"; // Add a CSS file for custom styles

// Define props for the BlogDetail component
interface BlogDetailProps {
  blogId: string;
}

const BlogDetail: React.FC<BlogDetailProps> = ({ blogId }) => {
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // State to store the logged-in user
  const auth = getAuth();

  useEffect(() => {
    // Check the authentication status on component mount
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser); // Store user info if logged in
      } else {
        setUser(null); // Set to null if user is logged out
      }
    });

    return () => unsubscribe(); // Clean up the subscription when the component unmounts
  }, [auth]);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const blogRef = doc(db, "blogs", blogId);
        const blogSnapshot = await getDoc(blogRef);

        if (blogSnapshot.exists()) {
          const blogData = blogSnapshot.data();
          
          // Ensure the createdAt date is converted to a valid JavaScript Date object
          if (blogData.createdAt && blogData.createdAt.toDate) {
            blogData.createdAt = blogData.createdAt.toDate();  // Convert Firestore Timestamp to Date object
          }
          
          setBlog(blogData);
        } else {
          console.error("No such blog!");
        }
      } catch (error) {
        console.error("Error fetching blog:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [blogId]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!blog) {
    return <p>Blog not found</p>;
  }

  return (
    <div className="blog-page">
      {/* Navbar with User Icon and Name */}
      <div className="navbar-container">
        <nav className="flex justify-between items-center px-6 py-4 border-b">
          <div className="text-xl font-bold">BLOG FUSION</div>
          <ul className="flex space-x-6">
            <li><Link href="#home" className="hover:text-gray-500">Home</Link></li>
            <li><Link href="#about" className="hover:text-gray-500">About</Link></li>
            <li><Link href="#services" className="hover:text-gray-500">Services</Link></li>
            <li><Link href="/blogfeed" className="hover:text-gray-500">Blog Feed</Link></li>
          </ul>
          <div className="flex items-center space-x-4">
            {/* Check if user is logged in, display the user icon and name */}
            {user ? (
              <>
                <FaUserCircle className="text-gray-500 w-8 h-8" /> {/* User Icon */}
                <span className="text-gray-500">{user.displayName}</span> {/* User Name */}
              </>
            ) : (
              <button
                className="border px-4 py-2 rounded hover:bg-gray-100"
                onClick={() => window.location.hash = "#contact"}
              >
                Contact
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Blog Content */}
      <div className="blog-content-container">
        <div className="blog-detail">
          <h1 className="blog-title">{blog.title}</h1>
          
          {/* Ensure the createdAt date is displayed properly */}
          <p className="blog-date">
            {blog.createdAt ? blog.createdAt.toLocaleString() : "Date not available"}
          </p>
          
          {blog.image && <img src={blog.image} alt={blog.title} className="blog-image" />}
          <div className="blog-content" dangerouslySetInnerHTML={{ __html: blog.content }} />
        </div>
      </div>

      {/* Footer Section */}
      <footer className="footer">
        <div className="text-center">
          <p className="text-sm">&copy; 2025 Blog Fusion. All Rights Reserved.</p>
          <div className="flex justify-center space-x-4 mt-4">
            <Link href="#" className="hover:text-gray-400">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-gray-400">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-gray-400">
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogDetail;
