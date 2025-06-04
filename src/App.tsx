import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './components/HomePage';
import FlashcardSession from './components/FlashcardSession';
import HelpFAQ from './components/HelpFAQ';
import VocabularyList from './components/VocabularyList';
import ProgressDashboard from './components/ProgressDashboard';

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/study" element={<FlashcardSession />} />
          <Route path="/help" element={<HelpFAQ />} />
          <Route path="/vocabulary" element={<VocabularyList />} />
          <Route path="/progress" element={<ProgressDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;