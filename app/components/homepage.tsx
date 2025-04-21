"use client";
import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import emailjs from "emailjs-com";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth, db, googleAuthProvider } from "../firebase/firebaseConfig";
import { motion } from 'framer-motion';
import { FaGoogle } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { getStripe } from '../lib/stripe';
import { setDoc, doc } from "firebase/firestore";

interface ModalProps {
  onClose: () => void;
}

const Homepage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginFormVisible, setIsLoginFormVisible] = useState(false);
  const [isSignupFormVisible, setIsSignupFormVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blogFunctionality, setBlogFunctionality] = useState<"manual" | "automated">("manual"); // New state for blog functionality
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const servicesSectionRef = useRef<HTMLDivElement>(null);
  const faqSectionRef = useRef<HTMLDivElement>(null);
  const contactSectionRef = useRef<HTMLDivElement>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoggedIn(!!user);
    });

    // Check URL parameters for subscription modal
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openSubscription') === 'true') {
      setIsSubscriptionModalOpen(true);
    }

    return () => unsubscribe();
  }, []);

  // Clear login fields when opening the login popup
  useEffect(() => {
    if (isLoginFormVisible) {
      setEmail("");
      setPassword("");
      setError(null);
    }
  }, [isLoginFormVisible]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    setIsSubmitted(true);
    e.preventDefault();

    const templateParams = {
      from_name: formData.name,
      to_name: "BlogFusion",
      message: formData.message,
      reply_to: formData.email,
    };

    emailjs
      .send(
        "service_2e35obu",
        "template_2qm2dh2",
        templateParams,
        "SvixGXc5ZGZdT5AB-"
      )
      .then(
        (response) => {
          console.log("SUCCESS!", response.status, response.text);
          setIsSubmitted(true);
        },
        (error) => {
          console.error("FAILED...", error);
        }
      );
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const toggleLoginForm = () => {
    // Clear all fields before showing the form
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
    setIsLoginFormVisible(!isLoginFormVisible);
    setIsSignupFormVisible(false);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setIsLoggedIn(false);
      setCurrentUser(null);
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleSignupForm = () => {
    setIsSignupFormVisible(!isSignupFormVisible);
    setIsLoginFormVisible(false);
    // Clear all fields
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user.emailVerified) {
        setIsLoginFormVisible(false); // Close login popup
        setCurrentUser(user);
        setIsLoggedIn(true);
        // Do NOT redirect to manual editor, stay on homepage
      } else {
        setError("Please verify your email before logging in.");
        await auth.signOut();
      }
    } catch (error: any) {
      setError("Login failed. Please check your credentials.");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Initialize user document with savedBlogs array
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: name,
        email: email,
        savedBlogs: [],
        createdAt: new Date()
      });

      await updateProfile(userCredential.user, { displayName: name });
      await sendEmailVerification(userCredential.user);
      alert("A verification email has been sent. Please verify your email before logging in.");
      toggleLoginForm();
      setIsSignupFormVisible(false);
    } catch (error: any) {
      setError(`${error.message}. Please try again.`);
    }
  };

  const toggleSubscription = () => {
    setIsModalOpen(!isModalOpen);
  };

  const Modal: React.FC<ModalProps> = ({ onClose }) => {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded shadow-lg w-full sm:w-3/4 md:w-2/3 lg:w-1/2">
          <h2 className="text-xl font-bold text-center mb-4">Subscription Plans</h2>
          <div className="flex justify-between mb-4">
            {/* Basic Package */}
            <div className="p-4 w-1/3 text-center border-2 border-gray-300 rounded-lg mx-4">
              <h3 className="font-bold text-lg mb-2">Basic</h3>
              <p className="text-sm mb-4">Perfect for individual users.</p>
              <div className="font-semibold mb-4">$10 / month</div>
              <button className="px-6 py-2 bg-black text-white rounded hover:bg-gray-600">
                Choose Plan
              </button>
            </div>

            {/* Medium Package */}
            <div className="p-4 w-1/3 text-center border-2 border-gray-300 rounded-lg mx-4">
              <h3 className="font-bold text-lg mb-2">Medium</h3>
              <p className="text-sm mb-4">Ideal for small teams.</p>
              <div className="font-semibold mb-4">$20 / month</div>
              <button className="px-6 py-2 bg-black text-white rounded hover:bg-gray-600">
                Choose Plan
              </button>
            </div>

            {/* Premium Package */}
            <div className="p-4 w-1/3 text-center border-2 border-gray-300 rounded-lg mx-4">
              <h3 className="font-bold text-lg mb-2">Premium</h3>
              <p className="text-sm mb-4">Best for large organizations.</p>
              <div className="font-semibold mb-4">$50 / month</div>
              <button className="px-6 py-2 bg-black text-white rounded hover:bg-gray-600">
                Choose Plan
              </button>
            </div>
          </div>

          <div className="flex justify-center mt-4">
            
            
            
            <button
              className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 mx-auto"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleGoogleLogin = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      const user = userCredential.user;

      if (user.emailVerified) {
        setIsLoginFormVisible(false); // Close login popup
        setCurrentUser(user);
        setIsLoggedIn(true);
        // Do NOT redirect, stay on homepage
      } else {
        setError("Please verify your email before logging in.");
        await auth.signOut();
      }
    } catch (error: any) {
      setError("Google login failed. Please try again.");
    }
  };

  const toggleForm = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
    setIsLoginFormVisible(!isLoginFormVisible);
    setIsSignupFormVisible(!isSignupFormVisible);
  };

  const handleForgotPassword = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent. Please check your inbox.");
    } catch (error: any) {
      setError("Failed to send password reset email. Please try again.");
    }
  };

  const [faqOpenStates, setFaqOpenStates] = useState<boolean[]>([false, false, false]);

  const toggleFaq = (index: number) => {
    setFaqOpenStates((prevStates) => {
      const newStates = [...prevStates];
      newStates[index] = !newStates[index];
      return newStates;
    });
  };

  const handleSubscriptionSelect = async (plan: string) => {
    if (!currentUser) {
      Swal.fire({
        title: 'Please Login',
        text: 'You need to be logged in to continue',
        icon: 'warning',
        confirmButtonColor: '#3B82F6',
      });
      toggleLoginForm();
      return;
    }

    // For basic plan, redirect to text-editor
    if (plan.toLowerCase() === 'basic') {
      router.push('/text-editor');
      return;
    }
  
    try {
      Swal.fire({
        title: 'Processing...',
        text: 'Please wait while we redirect you to checkout',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
  
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan,
          userId: currentUser.uid,
          userEmail: currentUser.email
        })
      });
  
      const data = await response.json();
  
      if (!response.ok || data.error) {
        throw new Error(data.error || data.message || 'Failed to create checkout session');
      }         
  
      if (!data.sessionId) {
        throw new Error('No session ID returned from server');
      }
  
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }
  
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });
  
      if (error) {
        throw new Error(error.message);
      }
  
    } catch (error: any) {
      console.error('Subscription error:', error);
      Swal.close();
      Swal.fire({
        title: 'Error',
        text: error.message || 'Failed to process subscription',
        icon: 'error',
        confirmButtonColor: '#3B82F6',
      });
    }
  };

  const SubscriptionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-6xl mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Choose Your Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Basic (Free) Plan */}
            <div className="flex-1 p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 transition-all duration-300">
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-2">Basic</h3>
                  <p className="text-green-600 font-semibold mb-4">Free Plan</p>
                  <p className="text-sm text-gray-600 mb-6">For users who want full control over their blogging process.</p>
                </div>
                
                <div className="flex-grow space-y-3">
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Manually choose topic
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Manually write blog content
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Publish to website
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Access to personal blog page
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    No AI support
                  </div>
                  <div className="flex items-center text-sm font-medium mt-4">
                    Limit: 3 posts per month
                  </div>
                </div>

                <button
                  onClick={() => handleSubscriptionSelect('basic')}
                  className="w-full mt-6 py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Get Started
                </button>
              </div>
            </div>

            {/* Medium Plan */}
            <div className="flex-1 p-6 border-2 border-green-500 rounded-xl bg-green-50 transform scale-105 relative">
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-3 py-1 rounded-full -mt-2 -mr-2">
                Popular
              </div>
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-2">Medium</h3>
                  <p className="text-green-600 font-semibold mb-4">$5.99/month</p>
                  <p className="text-sm text-gray-600 mb-6">For users who want AI help with content creation.</p>
                </div>

                <div className="flex-grow space-y-3">
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Manually or AI-select topic
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI-generated blog (limited to 3 blogs/month)
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Manual editing before publishing
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Publish to website
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Access to personal blog page
                  </div>
                  <div className="flex items-center text-sm font-medium mt-4">
                    Limit: 5 posts per month
                  </div>
                </div>

                <button
                  onClick={() => handleSubscriptionSelect('medium')}
                  className="w-full mt-6 py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Choose Plan
                </button>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="flex-1 p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 transition-all duration-300">
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-2">Premium</h3>
                  <p className="text-green-600 font-semibold mb-4">$14.99/month</p>
                  <p className="text-sm text-gray-600 mb-6">For users who want a hands-free blogging experience.</p>
                </div>

                <div className="flex-grow space-y-3">
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI selects topic
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI writes and publishes the blog automatically
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Option to edit before publishing
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Publish directly to personal blog page
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    View all published blogs in dashboard
                  </div>
                  <div className="flex items-center text-sm font-medium mt-4">
                    Unlimited posts
                  </div>
                </div>

                <button
                  onClick={() => handleSubscriptionSelect('premium')}
                  className="w-full mt-6 py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Choose Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-white border-b shadow">
        <div className="flex items-center space-x-6">
          <Link href="/" passHref>
            <div className="text-xl font-bold cursor-pointer">BLOG FUSION</div>
          </Link>

          {/* Navbar Menu */}
          <ul className="flex space-x-6">
            <li>
              <Link href="#home" className="hover:text-gray-500">
                Home
              </Link>
            </li>
            <li>
              <button
                className="hover:text-gray-500"
                onClick={() => scrollToSection(aboutSectionRef)}
              >
                About
              </button>
            </li>
            <li>
              <button
                className="hover:text-gray-500"
                onClick={() => scrollToSection(servicesSectionRef)}
              >
                Services
              </button>
            </li>
            <li>
              <button
                className="hover:text-gray-500"
                onClick={() => scrollToSection(faqSectionRef)}
              >
                FAQ
              </button>
            </li>
            <li>
              <Link href="/blogfeed" className="hover:text-gray-500">
                Blog Feed
              </Link>
            </li>
            <li>
              <button
                className="hover:text-gray-500"
                onClick={() => scrollToSection(contactSectionRef)}
              >
                Contact Us
              </button>
            </li>
          </ul>
        </div>

        {/* Login & Sign Up Buttons */}
        <div className="flex items-center space-x-4">
          {currentUser ? (
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="px-4 py-2 text-white bg-green-500 rounded hover:bg-green-600 transition-colors"
              >
                Subscription
              </button>
              <div className="relative group">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {currentUser.photoURL ? (
                      <Image
                        src={currentUser.photoURL}
                        alt="Profile"
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-gray-600">
                        {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-700 hidden md:block">
                    {currentUser.displayName || 'User'}
                  </span>
                </div>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 hidden group-hover:block border border-gray-100">
                  <Link 
                    href="/profile" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    My Profile
                  </Link>
                  <Link 
                    href="/dashboard" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      try {
                        await auth.signOut();
                        setIsLoggedIn(false);
                        router.push('/');
                      } catch (error) {
                        console.error("Error signing out:", error);
                      }
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={toggleLoginForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Login
              </button>
              <button
                onClick={toggleSignupForm}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-b from-gray-900 to-black">
        {/* Background with overlay */}
        <div className="absolute inset-0">
          <Image
            src="/heropic.jpg"
            alt="Background"
            layout="fill"
            objectFit="cover"
            quality={100}
            priority
            className="opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70"></div>
        </div>

        {/* Content */}
        <div className="relative h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Unleash Your Voice
              <span className="block text-green-400">Through Words</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Create, share, and inspire with your unique stories
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => scrollToSection(servicesSectionRef)}
                className="px-8 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transform hover:scale-105 transition-all duration-300"
              >
                Get Started
              </button>
              <button
                onClick={() => scrollToSection(aboutSectionRef)}
                className="px-8 py-3 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white/10 transition-all duration-300"
              >
                Learn More
              </button>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 animate-bounce">
            <svg 
              className="w-6 h-6 text-white" 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section 
        id="about" 
        ref={aboutSectionRef} 
        className="py-20 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <span className="inline-block px-3 py-1 text-sm font-semibold text-green-500 bg-green-50 rounded-full">
                EMPOWER YOUR VOICE
              </span>
              <h2 className="text-4xl font-bold text-gray-900 leading-tight">
                Craft Your Stories with 
                <span className="text-green-500"> Precision and Style</span>
              </h2>
              <div className="w-20 h-1 bg-green-500"></div>
              <p className="text-lg text-gray-600 leading-relaxed">
                At Blog Fusion, we empower creators to share their unique perspectives. 
                Our platform combines intuitive design with powerful features, making 
                blog creation seamless and enjoyable.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                {[
                  { title: 'Easy Writing', value: '100%' },
                  { title: 'Publishing Speed', value: '2min' },
                  { title: 'User Satisfaction', value: '99%' },
                  { title: 'Global Reach', value: '150+' }
                ].map((stat, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.title}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
              </div>
                <Link 
                  href="#contact"
                  className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-300"
                >
                  Start Writing
                </Link>
                <Link 
                  href="#services"
                  className="px-6 py-3 text-black hover:text-green-500 transition-all duration-300"
                >
                  Learn More →
                </Link>
              </motion.div>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-blue-100 transform rotate-6 rounded-2xl"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <Image
                  src="/aboutrm.png"
                  alt="About Blog Fusion"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover transform hover:scale-105 transition-all duration-500"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-500 rounded-full opacity-20"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Blog Posts Section (Services Section) */}
      <section id="services" ref={servicesSectionRef} className="bg-gradient-to-b from-gray-50 to-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
              BLOGGING MADE EASY
            </span>
            <h2 className="text-3xl font-bold mt-4 mb-2">
              Create, publish, and share with ease
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose your preferred way of creating content and start sharing your ideas with the world
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            {/* Manual Blog Writing Card */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/man.jpg"
                  alt="Manual Blog Writing"
                  layout="fill"
                  objectFit="cover"
                  className="transform hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex flex-col h-[calc(100%-192px)]"> {/* Fixed height calculation */}
                <div className="flex items-center mb-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold">Manual Blog Writing</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4 flex-grow"> {/* Added flex-grow */}
                  Create compelling content with our intuitive editor. Perfect for crafting detailed, 
                  personalized blog posts with complete creative control.
                </p>
                <button
                  onClick={() => {
                    if (currentUser) {
                      router.push('/text-editor');
                    } else {
                      setBlogFunctionality("manual");
                      toggleLoginForm();
                    }
                  }}
                  className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center group"
                >
                  Start Writing
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Automation Blog Writing Card */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src="/auto.jpg"
                  alt="Automation Blog Writing"
                  layout="fill"
                  objectFit="cover"
                  className="transform hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex flex-col h-[calc(100%-192px)]"> {/* Fixed height calculation */}
                <div className="flex items-center mb-4">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold">Automation Blog Writing</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4 flex-grow"> {/* Added flex-grow */}
                  Let AI assist you in creating SEO-optimized content. Ideal for consistent 
                  posting and data-driven blog creation.
                </p>
                <button
                  onClick={() => {
                    if (currentUser) {
                      router.push('/autoform');
                    } else {
                      setBlogFunctionality("automated");
                      toggleLoginForm();
                    }
                  }}
                  className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center group"
                >
                  Try Automation
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" ref={faqSectionRef} className="py-12 px-6">
        <h3 className="text-gray text-center text-sm font-bold mb-2">FAQ</h3>
        <h2 className="text-3xl font-bold text-center mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              question: "What is Blog Fusion?",
              answer:
                "Blog Fusion is a platform that helps you create and publish blogs effortlessly using a user-friendly interface inspired by Medium.",
            },
            {
              question: "How can I start blogging?",
              answer:
                "Simply sign up, log in, and use our intuitive manual editor to craft and publish your blogs.",
            },
            {
              question: "Is Blog Fusion free to use?",
              answer:
                "Yes, Blog Fusion offers free access to its basic features. Premium features may require a subscription.",
            },
          ].map((faq, index) => (
            <div
              key={index}
              className="bg-gray-100 p-4 rounded shadow cursor-pointer"
              onClick={() => toggleFaq(index)}
            >
              <h4 className="text-lg font-bold flex justify-between items-center">
                {faq.question}
                <span className="text-green-500">{faqOpenStates[index] ? "-" : "+"}</span>
              </h4>
              {faqOpenStates[index] && <p className="text-gray-600 mt-2">{faq.answer}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section ref={contactSectionRef} id="contact" className="flex flex-col md:flex-row items-center my-16 px-6 md:px-12">
        <div className="max-w-4xl mx-auto grid gap-8 lg:grid-cols-2">
          {/* Contact Form */}
          <div>
            <h3 className="text-black-500 text-sm font-bold mb-2">GET IN TOUCH</h3>
            <h2 className="text-3xl font-bold mb-4">
              We are here to help you blog better!
            </h2>
            {isSubmitted ? (
              <p className="text-green-600 font-bold">
                Thank you, {formData.name}! Your message has been sent.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@website.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Your message"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-black text-white font-bold py-3 px-4 rounded hover:bg-gray-600"
                >
                  Submit
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4">Contact Information</h3>
            <p className="mb-4">
              <strong>Email:</strong> blogfusion2025@gmail.com
            </p>
            <p className="mb-4">
              <strong>Location:</strong> Karachi, SD, PK
            </p>
            <h4 className="text-lg font-bold mb-2">Business Hours</h4>
            <ul className="text-gray-700 space-y-2">
              <li>Monday - Friday: 9:00 AM - 10:00 PM</li>
              <li>Saturday: 9:00 AM - 6:00 PM</li>
              <li>Sunday: 9:00 AM - 12:00 PM</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Login Form */}
      {isLoginFormVisible && (
        <section id="#login" className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <div className="relative bg-white p-8 rounded shadow-lg w-full max-w-md">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={toggleLoginForm}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4">Login</h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <form className="space-y-4" onSubmit={handleLogin} autoComplete="off">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="login-email"
                  name="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@website.com"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="login-password"
                  name="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  autoComplete="new-password"
                  required
                />
              </div>
            
              <button
                type="submit"
                className="w-full bg-black text-white font-bold py-3 px-4 rounded hover:bg-gray-600"
              >
                Login
              </button>
            </form>
            <div className="my-4 text-center text-sm text-gray-400">OR</div>
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded hover:bg-gray-100"
            >
              <FaGoogle className="mr-2" />
              Login with Google
            </button>
            <p className="mt-4 text-sm text-center text-gray-400">
              Forgot your password?{" "}
              <button
                onClick={handleForgotPassword}
                className="text-blue-400 hover:underline"
              >
                Reset
              </button>
            </p>
            <p className="mt-4 text-sm text-center text-gray-400">
              Do not have an account?{" "}
              <button
                onClick={toggleForm}
                className="text-blue-400 hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </section>
      )}

      {/* Sign Up Form */}
      {isSignupFormVisible && (
        <section className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <div className="relative bg-white p-8 rounded shadow-lg w-full max-w-md">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={toggleSignupForm}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <form className="space-y-4" onSubmit={handleSignUp} autoComplete="off">
              <div>
                <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="signup-name"
                  name="signup-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="signup-email"
                  name="signup-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@website.com"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="signup-password"
                  name="signup-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  autoComplete="new-password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white font-bold py-3 px-4 rounded hover:bg-gray-600"
              >
                Sign Up
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Footer Section */}
      <footer className="bg-gray-900 text-white py-6">
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

      {isSubscriptionModalOpen && (
        <SubscriptionModal onClose={() => setIsSubscriptionModalOpen(false)} />
      )}
    </div>
  );
};

export default Homepage;