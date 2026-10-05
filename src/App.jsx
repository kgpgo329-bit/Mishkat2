import React, { useState, useEffect } from 'react';
import Navbar from './ui/components/Navbar';
import Footer from './ui/components/Footer';
import SearchModal from './ui/components/SearchModal';
import HomeView from './ui/views/HomeView';
import ResultView from './ui/views/ResultView';
import SourcesView from './ui/views/SourcesView';
import JourneyView from './ui/views/JourneyView';
import AboutView from './ui/views/AboutView';
import AssessmentView from './ui/views/AssessmentView';
import JourneyReportView from './ui/views/JourneyReportView';
import mishkatApi from './api/mishkatApi';
import { Loader2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('هل القرآن من تأليف محمد؟');
  const [currentResult, setCurrentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Knowledge Journey & Assessment state
  const [sessionId] = useState(() => mishkatApi.getSessionId());
  const [journeyState, setJourneyState] = useState(null);
  const [journeyRecords, setJourneyRecords] = useState([]);
  const [assessmentData, setAssessmentData] = useState(null);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);

  // Load journey state when entering journey view or on initial mount
  const refreshJourney = async () => {
    try {
      const res = await mishkatApi.getJourney(sessionId);
      if (res && res.success && res.data) {
        setJourneyState(res.data.journeyProgress || res.data);
        if (Array.isArray(res.data.verifiedRecords)) {
          setJourneyRecords(res.data.verifiedRecords);
        }
      }
    } catch {
      // Non-blocking fallback
    }
  };

  useEffect(() => {
    if (currentView === 'journey') {
      refreshJourney();
    }
  }, [currentView]);

  // Handler when user asks a question from Home, SearchModal, Deep Learning, or Suggested questions
  const handleAskQuestion = async (questionText, options = {}) => {
    if (!questionText || !questionText.trim()) return;

    setCurrentQuestion(questionText.trim());
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await mishkatApi.askQuestion({
        questionText: questionText.trim(),
        sessionId,
        origin: options.origin || 'USER_QUESTION',
        parentRecordId: options.parentRecordId || null,
        options: options.pipelineOptions || {}
      });

      if (res && res.success && res.data) {
        setCurrentResult(res.data);
        if (res.data.journeyProgress) {
          setJourneyState(res.data.journeyProgress);
        }
        setCurrentView('result');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(res?.error || 'تعذر الحصول على إجابة موثقة من الخادم، يرجى المحاولة لاحقاً.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'تعذر الاتصال بالخادم، يرجى التحقق من الاتصال والمحاولة مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRecord = (record) => {
    handleAskQuestion(record.question || record.questionText);
  };

  const handleStartAssessment = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await mishkatApi.generateAssessment({ sessionId });
      if (res && res.success && res.data) {
        setAssessmentData(res.data);
        setCurrentView('assessment');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(res?.error || 'لا يمكن بدء الاختبار قبل إتمام 20 محطة موثقة في رحلتك.');
      }
    } catch (err) {
      setErrorMessage('تعذر إنشاء اختبار الفهم، يرجى المحاولة لاحقاً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssessmentSubmit = async (submission, assessmentId) => {
    setIsSubmittingAssessment(true);
    setErrorMessage(null);

    try {
      const aid = assessmentId || assessmentData?.assessmentId;
      const submitRes = await mishkatApi.submitAssessment({
        assessmentId: aid,
        responses: submission
      });

      if (submitRes && submitRes.success && submitRes.data) {
        const repRes = await mishkatApi.generateReport({
          sessionId,
          assessmentResult: submitRes.data
        });

        if (repRes && repRes.success && repRes.data) {
          setReportData(repRes.data.report || repRes.data);
          setAssessmentCompleted(true);
          setCurrentView('report');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setErrorMessage(repRes?.error || 'تم التقييم بنجاح، وتعذر توليد التقرير.');
        }
      } else {
        setErrorMessage(submitRes?.error || 'تعذر تسليم إجابات التقييم، يرجى إعادة المحاولة.');
      }
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء تقييم الإجابات، يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  const handleViewReport = () => {
    setCurrentView('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#06231C] text-white flex flex-col font-arabic selection:bg-[#34D399]/30 selection:text-[#34D399] relative">
      {/* Global Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Error Banner Notification */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto px-4 w-full mt-4 z-50">
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="text-sm">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white p-1 rounded-lg transition-colors"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#06231C]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-[#082A22] border border-[#1A5243] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-[#34D399] animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">جاري التحقق والتوثيق</h3>
            <p className="text-xs text-[#D1EAE2]/80 leading-relaxed">
              يتم استدعاء الأدلة من المصادر المعتمدة وفحص الحجج بدقة علمية...
            </p>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 relative z-10">
        {currentView === 'home' && (
          <HomeView onAskQuestion={handleAskQuestion} />
        )}

        {currentView === 'result' && (
          <ResultView
            question={currentQuestion}
            resultData={currentResult}
            onBack={() => setCurrentView('home')}
            onAskQuestion={handleAskQuestion}
          />
        )}

        {currentView === 'sources' && (
          <SourcesView />
        )}

        {currentView === 'journey' && (
          <JourneyView
            records={journeyRecords}
            journeyState={journeyState}
            onSelectRecord={handleSelectRecord}
            onStartAssessment={handleStartAssessment}
            onViewReport={handleViewReport}
            assessmentCompleted={assessmentCompleted}
            isLoading={isLoading}
          />
        )}

        {currentView === 'about' && (
          <AboutView />
        )}

        {currentView === 'assessment' && (
          <AssessmentView
            questions={assessmentData?.items || []}
            assessmentId={assessmentData?.assessmentId}
            onSubmitAssessment={handleAssessmentSubmit}
            onCancel={() => setCurrentView('journey')}
            isSubmitting={isSubmittingAssessment}
          />
        )}

        {currentView === 'report' && (
          <JourneyReportView
            reportData={reportData}
            onBackToJourney={() => setCurrentView('journey')}
            onAskQuestion={handleAskQuestion}
          />
        )}
      </main>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={handleAskQuestion}
      />

      {/* Footer */}
      <Footer
        setCurrentView={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
