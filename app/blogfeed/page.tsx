"use client";
import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./firebaseConfig"; // Adjust the path if necessary
import Link from "next/link";
import { FaThumbsUp, FaRegCommentDots, FaShare } from "react-icons/fa";  // Importing the required icons
import { MdTrendingUp, MdSearch } from 'react-icons/md';
import { motion } from "framer-motion";

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app);

const BlogFeed = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const stripHtmlTags = (content: string) => {
    const div = document.createElement("div");
    div.innerHTML = content;
    return div.textContent || div.innerText || "";
  };

  // Function to generate random values for likes, comments, and shares
  const generateRandomStats = () => {
    return {
      likes: Math.floor(Math.random() * 100) + 5, // Random value between 5 and 100
      comments: Math.floor(Math.random() * 50) + 5, // Random value between 5 and 50
      shares: Math.floor(Math.random() * 30) + 5, // Random value between 5 and 30
    };
  };

  const scrollToFAQ = () => {
    const faqSection = document.getElementById('faq');
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, "blogs"));
        const blogsData: any[] = [];
        querySnapshot.forEach((doc) => {
          const cleanContent = stripHtmlTags(doc.data().content);
          const { likes, comments, shares } = generateRandomStats(); // Get random stats

          blogsData.push({
            id: doc.id,
            title: doc.data().title,
            content: cleanContent,
            likes, // Random value for likes
            comments, // Random value for comments
            shares, // Random value for shares
          });
        });
        setBlogs(blogsData);
      } catch (error) {
        console.error("Error fetching blogs: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  const truncateContent = (content: string, maxLength: number = 150) => {
    return content.length > maxLength ? content.slice(0, maxLength) + "..." : content;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  // Filter blogs based on the search query
  const filteredBlogs = blogs.filter((blog) => {
    return (
      blog.title?.toLowerCase().includes(searchQuery) || 
      blog.content?.toLowerCase().includes(searchQuery)
    );
  });
  

  // Filter blogs with likes greater than or equal to 70 for trending blogs
  const trendingBlogs = filteredBlogs.filter((blog) => blog.likes >= 70); // Blogs with 70 or more likes
  const allBlogs = filteredBlogs.filter((blog) => blog.likes < 70); // Other blogs with less than 70 likes

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Enhanced Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold text-black">
                BLOG FUSION
              </span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-8">
                <Link href="/" className="text-gray-700 hover:text-black transition-colors duration-200">
                  Home
                </Link>
                <Link href="/#about" className="text-gray-700 hover:text-black transition-colors duration-200">
                  About
                </Link>
                <Link href="/#services" className="text-gray-700 hover:text-black transition-colors duration-200">
                  Services
                </Link>
                <Link href="/blogfeed" className="text-black font-medium">
                  Blog Feed
                </Link>
                <Link href="/#contact" className="px-4 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors duration-200">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Search Bar */}
      <div className="max-w-4xl mx-auto pt-8 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <MdSearch className="absolute left-4 top-3.5 text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
          />
        </motion.div>
      </div>

      {/* Trending Blogs Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 mb-8"
        >
          <MdTrendingUp className="text-3xl text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Trending Blogs</h2>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trendingBlogs.map((blog, index) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <BlogCard blog={blog} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* All Blogs Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900 mb-8"
        >
          All Blogs
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allBlogs.map((blog, index) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <BlogCard blog={blog} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-xl text-gray-600">Loading blogs...</div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Add BlogCard component
interface Blog {
  id: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
}

const BlogCard = ({ blog }: { blog: Blog }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
          {blog.title}
        </h3>
        <p className="text-gray-600 mb-4 line-clamp-3">
          {blog.content}
        </p>
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex space-x-4">
            <motion.span 
              whileHover={{ scale: 1.1 }}
              className="flex items-center text-gray-500 hover:text-green-600 transition-colors cursor-pointer"
            >
              <FaThumbsUp className="mr-1" />
              {blog.likes}
            </motion.span>
            <motion.span 
              whileHover={{ scale: 1.1 }}
              className="flex items-center text-gray-500 hover:text-green-600 transition-colors cursor-pointer"
            >
              <FaRegCommentDots className="mr-1" />
              {blog.comments}
            </motion.span>
            <motion.span 
              whileHover={{ scale: 1.1 }}
              className="flex items-center text-gray-500 hover:text-green-600 transition-colors cursor-pointer"
            >
              <FaShare className="mr-1" />
              {blog.shares}
            </motion.span>
          </div>
          <Link 
            href={`/blogfeed/${blog.id}`}
            className="px-4 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-900 transition-colors duration-200"
          >
            Read More
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default BlogFeed;
