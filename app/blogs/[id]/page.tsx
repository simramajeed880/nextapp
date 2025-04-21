"use client";
import React from "react";
import { useParams } from "next/navigation";
import BlogDetail from "../BlogDetail"; // Adjust the path if necessary

const BlogDetailPage = () => {
  const { id } = useParams(); // Extract the blog ID from the URL

  // Ensure id is a string (in case it gets inferred as string | string[])
  if (!id || Array.isArray(id)) {
    return <p>Blog ID is missing</p>; // Fallback in case ID is not valid
  }

  return <BlogDetail blogId={id} />;
};

export default BlogDetailPage;
