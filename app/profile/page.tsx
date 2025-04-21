"use client";
import React, { useState, useEffect } from "react";
import { auth } from "../firebase/firebaseConfig";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  updatePassword,
} from "firebase/auth";
import { FaUser, FaEnvelope, FaLock, FaHome, FaBookmark } from "react-icons/fa";
import Link from "next/link";
import Swal from "sweetalert2";
import SavedBlogs from "../components/SavedBlogs";
import { motion } from "framer-motion";

const ProfilePage: React.FC = () => {
  const user = auth.currentUser;
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState<string>(user?.displayName || "");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"profile" | "saved">("profile");

  const saveChanges = async () => {
    if (!username) {
      Swal.fire({
        title: "Error!",
        text: "Username is required",
        icon: "error",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (user) {
        await updateProfile(user, {
          displayName: username,
        });

        if (currentPassword && newPassword) {
          const credential = EmailAuthProvider.credential(
            user.email || "",
            currentPassword
          );
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, newPassword);
        }

        Swal.fire({
          title: "Success!",
          text: "Profile updated successfully",
          icon: "success",
          confirmButtonColor: "#3B82F6",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error!",
        text: (error as Error).message,
        icon: "error",
        confirmButtonColor: "#3B82F6",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="flex items-center space-x-3 text-gray-900 hover:text-gray-600 transition-colors"
            >
              <FaHome className="h-5 w-5" />
              <span className="font-bold text-xl">Blog Fusion</span>
            </Link>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-4"
            >
              <span className="text-sm font-medium text-gray-700">
                Welcome, {username || "User"}
              </span>
            </motion.div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex space-x-1 bg-white rounded-xl shadow-sm p-1 mb-6"
        >
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              activeTab === "profile"
                ? "bg-black text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FaUser className="w-4 h-4" />
              <span>Profile</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              activeTab === "saved"
                ? "bg-black text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FaBookmark className="w-4 h-4" />
              <span>Saved Posts</span>
            </div>
          </button>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {activeTab === "profile" ? (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="space-y-6">
                  {/* Username Input */}
                  <motion.div 
                    className="space-y-2"
                    whileHover={{ scale: 1.01 }}
                  >
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <FaUser className="w-4 h-4 text-gray-400" />
                      <span>Username</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      placeholder="Enter your username"
                    />
                  </motion.div>

                  {/* Email Display */}
                  <motion.div 
                    className="space-y-2"
                    whileHover={{ scale: 1.01 }}
                  >
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <FaEnvelope className="w-4 h-4 text-gray-400" />
                      <span>Email</span>
                    </label>
                    <div className="w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-500">
                      {user?.email}
                    </div>
                  </motion.div>

                  {/* Password Change Section */}
                  <motion.div 
                    className="space-y-4"
                    whileHover={{ scale: 1.01 }}
                  >
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <FaLock className="w-4 h-4 text-gray-400" />
                      <span>Change Password</span>
                    </label>
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="Current password"
                      />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                        placeholder="New password"
                      />
                    </div>
                  </motion.div>

                  {/* Save Button */}
                  <motion.div 
                    className="flex justify-end pt-6"
                    whileHover={{ scale: 1.02 }}
                  >
                    <button
                      onClick={saveChanges}
                      disabled={isLoading}
                      className="px-8 py-2.5 bg-black text-white rounded-lg hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </motion.div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <SavedBlogs />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
