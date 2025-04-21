'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Step,
  StepLabel,
  Stepper
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import InfoIcon from '@mui/icons-material/Info';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import SmartToyIcon from '@mui/icons-material/SmartToy';

// Types
interface BlogState {
  generatedBlog: string;
  keywords?: string[];
  urls?: string[];
}

interface HumanizeResponse {
  status: 'success' | 'error';
  humanized_content: string;
  ai_detection_original: number;
  ai_detection_humanized: number;
  sources_checked: number;
  message?: string;
}

const BlogEditor: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [editedBlog, setEditedBlog] = useState<string>('');
  const [suggestedContent, setSuggestedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHumanized, setIsHumanized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [copyStatus, setCopyStatus] = useState<string>('');
  const [aiScoreOriginal, setAiScoreOriginal] = useState<number | null>(null);
  const [aiScoreHumanized, setAiScoreHumanized] = useState<number | null>(null);
  const [sourcesChecked, setSourcesChecked] = useState<number>(0);
  const [progressStep, setProgressStep] = useState<number>(0);

  const humanizationSteps = [
    "Analyzing content",
    "Processing language patterns", 
    "Applying human writing style",
    "Refining and finalizing"
  ];

  // Read from URL params (state cannot be passed through next/router directly)
  const generatedBlog = searchParams.get('generatedBlog') || '';
  const keywords = searchParams.get('keywords')?.split(',') || [];
  const urls = searchParams.get('urls')?.split(',') || [];

  useEffect(() => {
    let blog = generatedBlog;
    if (!blog) {
      blog = sessionStorage.getItem('generatedBlog') || '';
    }
    if (blog) {
      setEditedBlog(blog);
    }
  }, [generatedBlog]);

  useEffect(() => {
    if (copyStatus) {
      const timer = setTimeout(() => setCopyStatus(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgressStep(prev => {
          if (prev < humanizationSteps.length - 1) {
            return prev + 1;
          }
          clearInterval(interval);
          return prev;
        });
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setProgressStep(0);
    }
  }, [isLoading]);

  const handleHumanizeBlog = async () => {
    setIsLoading(true);
    setProgressStep(0);
    try {
      const startTime = Date.now();
      
      const response = await fetch('/api/analyze', { // You should create this API route or use an absolute URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: editedBlog,
          keywords
        })
      });

      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 6000) {
        await new Promise(resolve => setTimeout(resolve, 6000 - elapsedTime));
      }

      const data: HumanizeResponse = await response.json();

      if (response.ok && data.status === 'success') {
        console.log('Humanization response:', data);
        setAiScoreOriginal(data.ai_detection_original || 85);
        setAiScoreHumanized(data.ai_detection_humanized || 25);

        const formattedHumanizedContent = preserveFormatting(
          editedBlog,
          data.humanized_content || ''
        );
        
        setSuggestedContent(formattedHumanizedContent);
        setSourcesChecked(data.sources_checked || 3);

        setActiveTab(1);
        setIsHumanized(true);

        sessionStorage.setItem('generatedBlog', data.humanized_content || '');
        router.push('/blogeditor');
      } else {
        throw new Error(data.message || 'Humanization failed');
      }
    } catch (error: any) {
      console.error('Error humanizing content:', error);
      setCopyStatus(`Error: ${error.message || 'Failed to humanize content'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const preserveFormatting = (original: string, humanized: string) => {
    const originalLines = original.split('\n');
    const humanizedLines = humanized.split('\n');
    let originalTitle = '';

    for (const line of originalLines) {
      if (line.trim().startsWith('#')) {
        originalTitle = line;
        break;
      }
    }

    let hasTitle = false;
    for (const line of humanizedLines) {
      if (line.trim().startsWith('#')) {
        hasTitle = true;
        break;
      }
    }

    let formattedContent = humanized;
    if (originalTitle && !hasTitle) {
      formattedContent = originalTitle + '\n\n' + formattedContent;
    }

    if (formattedContent.split('\n\n').length < original.split('\n\n').length) {
      const originalParagraphCount = original.split('\n\n').length;
      formattedContent = formattedContent.replace(/([.!?])\s+/g, '$1\n\n');

      const currentBreaks = formattedContent.split('\n\n').length;
      if (currentBreaks > originalParagraphCount * 1.5) {
        formattedContent = formattedContent.split('\n\n')
          .slice(0, originalParagraphCount + 1)
          .join('\n\n') + '\n\n' + 
          formattedContent.split('\n\n').slice(originalParagraphCount + 1).join(' ');
      }
    }

    return formattedContent;
  };

  const handleUseHumanizedContent = () => {
    setEditedBlog(suggestedContent);
    setIsHumanized(true);
    setActiveTab(0);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(currentContent);
    setCopyStatus('Content copied to clipboard!');
  };

  const formatBlogContent = (content: string) => {
    return content
      .replace(/^-{3,}/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/#{1,6}\s+(.*)/g, (match, p1) => {
        const level = match.split(' ')[0].length;
        return `<h${level}>${p1}</h${level}>`;
      })
      .replace(/For more information([\s\S]*?)(?=\n|$)/g, (match) => {
        return `<div class="references-section">${match.replace('---', '')}</div>`;
      })
      .split('\n')
      .map(line => line.trim() ? `<p>${line}</p>` : '')
      .join('');
  };

  const handlePublish = () => {
    try {
      const contentToPublish = currentContent;
      
      let processedBlog = contentToPublish;
      keywords.forEach((keyword, index) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        if (urls[index]) {
          processedBlog = processedBlog.replace(regex, `<a href="${urls[index]}" target="_blank" rel="noopener noreferrer">${keyword}</a>`);
        }
      });

      const formattedBlog = `
        <div class="blog-content">
          ${formatBlogContent(processedBlog)
            .replace(/\n/g, '</p>\n<p>')
            .replace(/<p><\/p>/g, '')}
        </div>
      `;

      router.push(`/published?content=${encodeURIComponent(formattedBlog)}`);
    } catch (error) {
      console.error('Publishing Error:', error);
    }
  };

  const currentContent = activeTab === 0 ? editedBlog : suggestedContent;
  const currentScore = activeTab === 0 ? aiScoreOriginal : aiScoreHumanized;

  if (!generatedBlog) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5">No blog content found</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push('/')}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', mt: 4, p: 3 }}>
      {/* You can continue your design here */}
      <Typography variant="h3" fontWeight="bold">
        Blog Editor
      </Typography>
    </Box>
  );
};

export default BlogEditor;
