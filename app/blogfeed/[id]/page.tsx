"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getFirestore, doc, getDoc, setDoc, Timestamp, updateDoc, increment, arrayRemove, arrayUnion } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "../firebaseConfig"; // Adjust if necessary
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { toast } from "react-toastify";
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app);
const auth = getAuth(app);

// Function to format blog content and embed keyword URLs
const formatBlogContent = (content: string, keywords: string[], urls: string[]): string => {
  if (!content) return "";

  // Remove any existing h1 tags from the content
  content = content.replace(/<h1[^>]*>.*?<\/h1>/g, '');

  // Enhanced header formatting with proper styling classes
  content = content
    .replace(/^## (.*$)/gim, '<h2 class="text-3xl font-semibold text-gray-800 mt-8 mb-4">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-2xl font-medium text-gray-700 mt-6 mb-3">$1</h3>')
    .replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed">') // Format paragraphs
    .replace(/- (.*$)/gim, '<li class="ml-6 mb-2">$1</li>'); // Enhanced list items

  // Embed keyword links with improved styling
  keywords.forEach((keyword, index) => {
    const url = urls[index]?.trim() || "#";
    const keywordRegex = new RegExp(`\\b${keyword}\\b`, "gi");
    content = content.replace(
      keywordRegex,
      `<a href="${url}" class="text-blue-600 font-medium hover:text-blue-800 transition-colors" target="_blank" rel="noopener noreferrer">${keyword}</a>`
    );
  });

  return content;
};

// Add this type definition
interface Comment {
  text: string;
  author: string;
  date: Timestamp | Date;
  userId?: string;
}

// Add this helper function
const formatDate = (date: Timestamp | Date): string => {
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleString();
  }
  return new Date(date).toLocaleString();
};

const provider = new GoogleAuthProvider();

// Add this helper function at the top of the file
const handleGoogleLogin = async () => {
  try {
    // First check if popups are blocked
    const popupTest = window.open('', '_blank');
    if (!popupTest || popupTest.closed || typeof popupTest.closed === 'undefined') {
      toast.error('Please enable popups for this site to login');
      return null;
    }
    popupTest.close();

    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      const userRef = doc(firestoreDb, "users", result.user.uid);
      await setDoc(userRef, {
        name: result.user.displayName,
        email: result.user.email,
        createdAt: new Date(),
      }, { merge: true });
      
      toast.success('Successfully logged in!');
      return result.user;
    }
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked') {
      toast.error('Please enable popups in your browser and try again');
    } else {
      toast.error('Error signing in with Google');
      console.error('Login error:', error);
    }
    return null;
  }
};

// Add this helper function at the top of the file
const formatBlogDate = (timestamp: Timestamp | Date | null): string => {
  if (!timestamp) return "Date not available";
  
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// First, update the interface to include authorName
interface BlogData {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: Timestamp;
  likes: number;
  comments: number;
  shares: number;
  // ...other fields
}

const BlogDetailPage = () => {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!id || Array.isArray(id)) {
      setError("Blog ID is missing");
      setLoading(false);
      return;
    }

    const fetchBlog = async () => {
      try {
        const blogRef = doc(firestoreDb, "blogs", id);
        const docSnapshot = await getDoc(blogRef);

        if (docSnapshot.exists()) {
          const blogData = docSnapshot.data();

          // Ensure likes, comments, and shares exist
          if (!blogData.likes || !blogData.comments || !blogData.shares) {
            const updatedData = {
              likes: blogData.likes || Math.floor(Math.random() * 100),
              comments: blogData.comments || Math.floor(Math.random() * 50),
              shares: blogData.shares || Math.floor(Math.random() * 20),
            };

            await setDoc(blogRef, { ...blogData, ...updatedData }, { merge: true });

            blogData.likes = updatedData.likes;
            blogData.comments = updatedData.comments;
            blogData.shares = updatedData.shares;
          }

          // Fetch Firestore keywords & URLs
          const keywords: string[] = blogData.keywords?.split(",").map((k: string) => k.trim()) || [];
          const urls: string[] = blogData.urls?.split(",").map((u: string) => u.trim()) || [];

          // Format blog content with embedded links
          const formattedContent = formatBlogContent(blogData.content || "", keywords, urls);

          const user = auth.currentUser;
          const name = user ? user.displayName : "Unknown Author";

          if (blogData.createdAt && blogData.createdAt.seconds) {
            blogData.createdAt = new Date(blogData.createdAt.seconds * 1000); // Convert Firestore timestamp
          }

          // Handle comments properly
          const fetchedComments = blogData.commentsList || [];
          setComments(fetchedComments);
          
          setBlog({ 
            ...blogData, 
            content: formattedContent,
            comments: fetchedComments.length // Update comment count
          });
          setAuthorName(name);
        } else {
          setError("Blog not found");
        }
      } catch (error) {
        setError("Error fetching blog");
        console.error("Error fetching blog: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  useEffect(() => {
    const checkIfBlogIsSaved = async () => {
      if (auth.currentUser && id) {
        const userRef = doc(firestoreDb, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const savedBlogs = userDoc.data().savedBlogs || [];
          setIsSaved(savedBlogs.includes(id));
        }
      }
    };

    checkIfBlogIsSaved();
  }, [id, auth.currentUser]);

  // Update the fetchBlog function in useEffect
  const fetchBlog = async () => {
    try {
      const blogRef = doc(firestoreDb, "blogs", id as string);
      const docSnapshot = await getDoc(blogRef);

      if (docSnapshot.exists()) {
        const blogData = docSnapshot.data();
        
        // Handle the creation date
        let createdAt = null;
        if (blogData.createdAt) {
          createdAt = blogData.createdAt instanceof Timestamp 
            ? blogData.createdAt 
            : new Timestamp(blogData.createdAt.seconds, blogData.createdAt.nanoseconds);
        }

        // Fetch Firestore keywords & URLs
        const keywords: string[] = blogData.keywords?.split(",").map((k: string) => k.trim()) || [];
        const urls: string[] = blogData.urls?.split(",").map((u: string) => u.trim()) || [];

        // Format blog content with embedded links
        const formattedContent = formatBlogContent(blogData.content || "", keywords, urls);

        // Handle comments properly
        const fetchedComments = blogData.commentsList || [];
        setComments(fetchedComments);

        // Fetch author details from Firestore
        const authorId = blogData.authorId;
        let authorName = blogData.authorName; // Get author name directly from blog document

        // If we have an authorId, try to get updated name from users collection
        if (authorId) {
          try {
            const authorRef = doc(firestoreDb, "users", authorId);
            const authorDoc = await getDoc(authorRef);
            if (authorDoc.exists()) {
              // Update author name if available in users collection
              authorName = authorDoc.data().name || authorName;
            }
          } catch (error) {
            console.error("Error fetching author details:", error);
            // Keep the original author name if there's an error
          }
        }

        // Rest of your existing blog data handling
        setBlog({
          ...blogData,
          content: formattedContent,
          comments: fetchedComments.length,
          createdAt: createdAt || new Timestamp(Date.now() / 1000, 0), // Fallback to current time if no date
          authorName // Set the author name
        });
        setAuthorName(authorName); // Update the author name state
      }
    } catch (error) {
      console.error("Error fetching blog:", error);
      setError("Error fetching blog");
    }
  };

  // Update the handleLike function
  const handleLike = async () => {
    if (!auth.currentUser) {
      const wantToLogin = window.confirm('Please login to like posts. Would you like to login now?');
      if (wantToLogin) {
        const user = await handleGoogleLogin();
        if (user) {
          // Proceed with like after successful login
          await handleLikeAction();
        }
      }
      return;
    }

    await handleLikeAction();
  };

  // Add this helper function to handle the like action
  const handleLikeAction = async () => {
    try {
      const blogRef = doc(firestoreDb, "blogs", id as string);
      const userRef = doc(firestoreDb, "users", auth.currentUser!.uid);

      if (isLiked) {
        await updateDoc(blogRef, {
          likes: increment(-1),
          likedBy: arrayRemove(auth.currentUser!.uid)
        });
        setBlog({ ...blog, likes: blog.likes - 1 });
      } else {
        await updateDoc(blogRef, {
          likes: increment(1),
          likedBy: arrayUnion(auth.currentUser!.uid)
        });
        setBlog({ ...blog, likes: blog.likes + 1 });
      }
      setIsLiked(!isLiked);
    } catch (error) {
      toast.error('Error updating like');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error('Please login to comment');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const blogRef = doc(firestoreDb, "blogs", id as string);
      const newComment = {
        text: commentText,
        author: auth.currentUser.displayName || 'Anonymous',
        date: new Date(),
        userId: auth.currentUser.uid
      };

      await updateDoc(blogRef, {
        commentsList: arrayUnion(newComment),
        comments: increment(1)
      });

      setComments([...comments, newComment]);
      setBlog({ ...blog, comments: blog.comments + 1 });
      setCommentText('');
      setShowCommentModal(false);
      toast.success('Comment added successfully');
    } catch (error) {
      toast.error('Error adding comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the handleCommentButtonClick function
  const handleCommentButtonClick = async () => {
    if (!auth.currentUser) {
      const wantToLogin = window.confirm('Please login with Google to comment on this blog. Would you like to login now?');
      
      if (wantToLogin) {
        const user = await handleGoogleLogin();
        if (user) {
          setShowCommentModal(true);
        }
        return;
      }
      return;
    }
    
    setShowCommentModal(true);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: blog.title,
          text: 'Check out this blog post!',
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }

      const blogRef = doc(firestoreDb, "blogs", id as string);
      await updateDoc(blogRef, {
        shares: increment(1)
      });
      setBlog({ ...blog, shares: blog.shares + 1 });
    } catch (error) {
      toast.error('Error sharing blog');
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast.success('Signed out successfully');
      router.push('/'); // Redirect to homepage after sign out
    } catch (error) {
      toast.error('Error signing out');
      console.error('Sign out error:', error);
    }
  };

  // Add this function after your other handler functions
  const handleSaveBlog = async () => {
    if (!auth.currentUser) {
      const wantToLogin = window.confirm('Please login to save blogs. Would you like to login now?');
      if (wantToLogin) {
        const user = await handleGoogleLogin();
        if (user) {
          await saveBlogToProfile();
        }
      }
      return;
    }

    await saveBlogToProfile();
  };

  const saveBlogToProfile = async () => {
    if (!auth.currentUser || !id) return;
    
    try {
      const userRef = doc(firestoreDb, "users", auth.currentUser.uid);
      
      if (isSaved) {
        await updateDoc(userRef, {
          savedBlogs: arrayRemove(id)
        });
        setIsSaved(false);
        toast.success('Blog removed from saved items');
      } else {
        await updateDoc(userRef, {
          savedBlogs: arrayUnion(id)
        });
        setIsSaved(true);
        toast.success('Blog saved successfully');
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error('Error saving blog');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-gray-600 animate-pulse">Loading blog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-gray-600">Blog not found</p>
      </div>
    );
  }

  const blogDate = blog.createdAt?.toLocaleString() || "Date not available";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left side - Back button */}
          <Link 
            href="/blogfeed" 
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back</span>
          </Link>

          {/* Right side - User Profile */}
          <div className="relative">
            {auth.currentUser ? (
              <div className="flex items-center">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 group"
                >
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">
                      {auth.currentUser.displayName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-gray-700 group-hover:text-black transition-colors">
                    {auth.currentUser.displayName || 'User'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50"
                  >
                    {/* Profile Link */}
                    <Link
                      href="/profile"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile</span>
                    </Link>

                    {/* Saved Blogs Link */}
                    <Link
                      href="/saved-blogs"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <span>Saved Blogs</span>
                    </Link>

                    {/* Sign Out Button */}
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
              >
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.article 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm overflow-hidden"
        >
          {/* Blog Header */}
          <header className="p-8 border-b border-gray-100">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {authorName?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{authorName}</h3>
                <time className="text-sm text-gray-500">
                  {formatBlogDate(blog.createdAt)}
                </time>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {blog.title}
            </h1>
          </header>

          {/* Blog Content */}
          <div className="p-8">
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-black prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </div>

          {/* Engagement Section */}
          <div className="px-8 py-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                {/* Likes */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLike}
                  className={`flex items-center space-x-2 ${
                    isLiked ? 'text-black' : 'text-gray-600'
                  } hover:text-black transition-colors`}
                >
                  <svg className="w-6 h-6" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" 
                    />
                  </svg>
                  <span className="font-medium">{blog.likes}</span>
                </motion.button>

                {/* Comments */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCommentButtonClick}
                  className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                    />
                  </svg>
                  <span className="font-medium">{blog.comments}</span>
                </motion.button>

                {/* Share */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShare}
                  className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
                    />
                  </svg>
                  <span className="font-medium">{blog.shares}</span>
                </motion.button>
              </div>

              {/* Save Button */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSaveBlog}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg 
                  className={`w-6 h-6 ${
                    isSaved ? 'text-green-600 fill-current' : 'text-gray-600 hover:text-black'
                  } transition-colors`} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    fill={isSaved ? 'currentColor' : 'none'}
                  />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-100">
            <div className="p-8">
              <h3 className="text-xl font-semibold mb-6">Comments ({comments.length})</h3>
              
              {comments.length > 0 ? (
                <div className="space-y-6">
                  {comments.map((comment, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex items-center mb-2">
                        <div className="bg-blue-100 rounded-full p-2">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{comment.author}</p>
                          <p className="text-xs text-gray-500">{formatDate(comment.date)}</p>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm ml-9">{comment.text}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
              )}
            </div>
          </div>
        </motion.article>
      </main>

      {/* Comment Modal with updated styling */}
      {showCommentModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-semibold mb-4">Add Comment</h3>
            <form onSubmit={handleComment}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-2 border rounded-md mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Write your comment..."
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCommentModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default BlogDetailPage;
