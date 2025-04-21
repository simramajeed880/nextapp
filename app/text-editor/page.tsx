"use client";

import React, { useState, useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { db } from "../firebase/firebaseConfig";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { auth } from "../firebase/firebaseConfig";
import { customSignOut } from "../firebase/firebaseConfig";
import { useRouter } from "next/navigation";
import { FaUserCircle } from "react-icons/fa";
import Swal from "sweetalert2";

const TextEditor = () => {
  const [editorHtml, setEditorHtml] = useState<string>(""); // State for Quill content
  const [title, setTitle] = useState<string>(""); // State for blog title
  const [metaDescription, setMetaDescription] = useState<string>(""); // State for meta description
  const [category, setCategory] = useState<string>(""); // State for blog category
  const [user, setUser] = useState<any>(null); // State for authenticated user
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true); // State for sidebar visibility
  const [monthlyPostCount, setMonthlyPostCount] = useState<number>(0); // State for monthly post count

  const editorRef = useRef<HTMLDivElement | null>(null); // Ref for the Quill editor container
  const quillRef = useRef<Quill | null>(null); // Ref to hold the Quill instance
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser({
          ...currentUser,
          displayName: currentUser.displayName || "User", // Fallback to "User"
        });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const categories = ["Technology", "Health", "Lifestyle", "Business", "Travel", "Food"];

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: "1" }, { header: "2" }, { font: [] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["bold", "italic", "underline"],
            ["link", "image"],
            [{ align: [] }],
            ["clean"],
          ],
        },
      });

      // Modify pasted/uploaded images to include alt tags
      quillRef.current.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
        if ((node as Element).tagName === "IMG") {
          const altText = prompt("Enter alt text for the image:", "Image description");
          const imgIndex = delta.ops.findIndex((op) => op.insert && (op.insert as Record<string, unknown>).image);
          if (imgIndex >= 0) {
            delta.ops[imgIndex].attributes = {
              ...delta.ops[imgIndex].attributes,
              alt: altText || "Image",
            };
          }
        }
        return delta;
      });

      quillRef.current.on("text-change", () => {
        setEditorHtml(quillRef.current?.root.innerHTML || "");
      });
    }
  }, []);

  // Function to check monthly post limit
  const checkMonthlyPostLimit = async (userId: string) => {
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Only query by userId
      const blogsRef = collection(db, "blogs");
      const q = query(blogsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      // Filter the results in memory for the current month
      const postsThisMonth = querySnapshot.docs.filter(doc => {
        const postDate = doc.data().createdAt?.toDate();
        return postDate && postDate >= firstDayOfMonth && postDate <= lastDayOfMonth;
      });

      return postsThisMonth.length;
    } catch (error) {
      console.error('Error checking monthly post limit:', error);
      return 0;
    }
  };

  // Function to show limit exceeded popup
  const showLimitExceededPopup = () => {
    return Swal.fire({
      title: 'Monthly Limit Exceeded',
      text: 'You have reached your limit of 3 posts for this month. Upgrade your plan to post more!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Upgrade Plan',
      cancelButtonText: 'Maybe Later',
      confirmButtonColor: '#3B82F6',
    }).then((result) => {
      if (result.isConfirmed) {
        // Redirect to homepage with subscription modal parameter
        router.push('/?openSubscription=true');
      }
      return result;
    });
  };

  const handleSave = async () => {
    if (!title.trim() || !editorHtml.trim() || !category.trim() || !user) {
      alert("Title, content, category, and user are required.");
      return;
    }

    // Validate title length (50-60 characters)
    if (title.length < 50 || title.length > 60) {
      alert("Title must be between 50 and 60 characters.");
      return;
    }

    // Validate meta description length (150-160 characters)
    if (metaDescription.length < 150 || metaDescription.length > 160) {
      alert("Meta description must be between 150 and 160 characters.");
      return;
    }

    try {
      // Check monthly post limit for basic plan users
      const postCount = await checkMonthlyPostLimit(user.uid);
      if (postCount >= 3) {
        const result = await showLimitExceededPopup();
        if (result.isConfirmed) {
          // Redirect to homepage with subscription modal parameter
          router.push('/?openSubscription=true');
        }
        return;
      }

      await addDoc(collection(db, "blogs"), {
        title,
        metaDescription,
        content: editorHtml,
        category,
        userId: user.uid,
        createdAt: new Date(),
      });
      
      Swal.fire({
        title: 'Success!',
        text: 'Blog saved successfully!',
        icon: 'success',
        confirmButtonColor: '#3B82F6',
      });

      setTitle("");
      setMetaDescription("");
      setCategory("");
      if (quillRef.current) {
        quillRef.current.root.innerHTML = "";
      }
      setEditorHtml("");
    } catch (error) {
      console.error("Error saving blog:", error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to save blog. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3B82F6',
      });
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await customSignOut();
      localStorage.removeItem("user");
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("An error occurred while logging out. Please try again.");
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <div
        style={{
          width: isSidebarOpen ? "250px" : "0",
          backgroundColor: "#000",
          color: "#fff",
          padding: "30px 20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "2px 0 8px rgba(0, 0, 0, 0.2)",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          transition: "all 0.3s ease",
          overflow: "hidden",
        }}
      >
        {/* Sidebar Menu */}
        <div>
          <h3 style={{ color: "#ecf0f1", marginBottom: "20px", fontSize: "24px" }}>Menu</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: "15px" }}>
              <a href="/" style={{ color: "#bdc3c7", textDecoration: "none", fontSize: "18px" }}>
                Home
              </a>
            </li>
            <li style={{ marginBottom: "15px" }}>
              <a href="/profile" style={{ color: "#bdc3c7", textDecoration: "none", fontSize: "18px" }}>
                My Profile
              </a>
            </li>
            <li style={{ marginBottom: "15px" }}>
              <a href="/blogs" style={{ color: "#bdc3c7", textDecoration: "none", fontSize: "18px" }}>
                My Blogs
              </a>
            </li>
            <li>
              <button
                onClick={handleLogout}
                style={{
                  color: "#bdc3c7",
                  fontSize: "18px",
                  padding: "10px",
                  borderRadius: "5px",
                  backgroundColor: "grey",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          marginLeft: isSidebarOpen ? "250px" : "0",
          flex: 1,
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Welcome Message */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "30px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "18px",
            color: "#34495e",
          }}
        >
          {user && (
            <>
              <span>Welcome, {user.displayName || "User"}</span>
              <FaUserCircle className="text-3xl text-gray-500" />
            </>
          )}
        </div>

        <h1 style={{ fontSize: "30px", marginBottom: "20px", color: "#34495e" }}>Text Editor</h1>

        {/* Blog Title */}
        <div style={{ width: "80%", marginBottom: "20px" }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter Blog Title (50-60 characters)"
            style={{
              padding: "12px",
              fontSize: "18px",
              width: "100%",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          />
          <p style={{ fontSize: "14px", color: title.length < 50 || title.length > 60 ? "red" : "green" }}>
            {title.length}/60 characters
          </p>
        </div>

        {/* Meta Description */}
        <div style={{ width: "80%", marginBottom: "20px" }}>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Enter Meta Description (150-160 characters)"
            style={{
              padding: "12px",
              fontSize: "18px",
              width: "100%",
              borderRadius: "8px",
              border: "1px solid #ddd",
              resize: "vertical",
              minHeight: "100px",
            }}
          />
          <p
            style={{
              fontSize: "14px",
              color: metaDescription.length < 150 || metaDescription.length > 160 ? "red" : "green",
            }}
          >
            {metaDescription.length}/160 characters
          </p>
        </div>

        {/* Category Dropdown */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "12px",
            fontSize: "18px",
            width: "80%",
            marginBottom: "20px",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Quill Editor */}
        <div
          ref={editorRef}
          style={{
            height: "300px",
            width: "80%",
            marginBottom: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        ></div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          style={{
            padding: "10px 20px",
            backgroundColor: "#16a085",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default TextEditor;