import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface FAQ {
  question: string;
  answer: string | ReactNode;
}

const HelpFAQ: React.FC = () => {
  const navigate = useNavigate();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // Toggle expansion
  const toggleFAQ = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(index);
    }
  };
  
  const faqs: FAQ[] = [
    {
      question: "How do I use this app?",
      answer: (
        <div>
          <p>On the home screen, select an HSK Level from the drop-down and choose your character set preference (Simplified or Traditional).</p>
          <p className="mt-2">Click "Start Study Session" to begin studying. While studying, click the "flip card" button to view the translation. Navigate through cards using the "Previous" and "Next" buttons.</p>
          <p className="mt-2">If for any reason you need to end the session early, click the "End Session" button. When you reach the last card, click the "Complete Session" button to see a summary of your study session.</p>
        </div>
      )
    },
    {
      question: "How does this app help me learn Chinese?",
      answer: (
        <div>
          <p>This app provides you with flashcards organized into decks which align with the the levels of the HSK standardized test of Chinese language proficiency.</p>
          <p className="mt-2">By focusing on the HSK vocabulary lists, you're learning the some of the most commonly used characters and vocabulary, which is an efficient way to learn Chinese.</p>
        </div>
      )
    },
    {
      question: "What is the HSK?",
      answer: (
        <div>
          <p>The HSK (Hanyu Shuiping Kaoshi) is a standardized test for Chinese language proficiency for non-native speakers. It's administered by Hanban, and is widely recognized for academic and professional purposes.</p>
          <p className="mt-2">There are 6 levels in the standard HSK, with level 1 being the most basic and level 6 being the most advanced. The new HSK system (implemented in 2021) has 9 levels, which this app also supports.</p>
        </div>
      )
    },
    {
      question: "What is the difference between Simplified and Traditional characters?",
      answer: (
        <div>
          <p>Simplified characters have fewer strokes and are more commonly used in mainland China, Singapore, and Malaysia. They were introduced in the 1950s and 1960s to increase literacy rates.</p>
          <p className="mt-2">Traditional characters have more strokes and are more commonly used in Taiwan, Hong Kong, Macau, and many overseas Chinese communities. They preserve the historical forms of Chinese writing.</p>
          <p className="mt-2">For beginners, it's recommended to start with one system rather than learning both. Most students choose Simplified if they plan to interact primarily with mainland China, or Traditional if focusing on Taiwan.</p>
        </div>
      )
    },
    {
      question: "Can I switch between Chinese to English and English to Chinese study modes?",
      answer: (
        <div>
          <p>Yes! During a study session, you can click the "Switch to [Other Mode]" button at the top of the screen to toggle between Chinese → English mode and English → Chinese mode.</p>
          <p className="mt-2">This is helpful for practicing both recognition (seeing Chinese and recalling the meaning) and production (seeing English and recalling the Chinese character).</p>
        </div>
      )
    },
    {
      question: "Does this app teach pinyin and tones?",
      answer: (
        <div>
          <p>This app shows pinyin for each character, but doesn't specifically teach tone pronunciation. It assumes you have a basic familiarity with Chinese phonetics.</p>
          <p className="mt-2">To learn more about tones, we recommend supplementing this app with audio resources or a tutor who can help with pronunciation.</p>
        </div>
      )
    }
  ];
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 my-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <span className="text-xl">←</span>
          </button>
          <h2 className="text-2xl font-bold">Help & FAQs</h2>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex justify-between items-center p-4 text-left font-medium hover:bg-gray-50 focus:outline-none"
              >
                <span>{faq.question}</span>
                <span className="text-lg">
                  {expandedIndex === index ? '-' : '+'}
                </span>
              </button>
              
              {expandedIndex === index && (
                <div className="p-4 bg-gray-50 border-t">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HelpFAQ;