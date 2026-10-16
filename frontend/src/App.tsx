import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import IncomePage from './pages/IncomePage';
import BudgetPage from './pages/BudgetPage';
import GoalsPage from './pages/GoalsPage';
import AICoachPage from './pages/AICoachPage';
import FinancialHealthPage from './pages/FinancialHealthPage';
import MarketPage from './pages/MarketPage';
import StockAnalysisPage from './pages/StockAnalysisPage';
import MutualFundsPage from './pages/MutualFundsPage';
import RiskAssessmentPage from './pages/RiskAssessmentPage';
import InvestmentRecommendationsPage from './pages/InvestmentRecommendationsPage';
import PortfolioPage from './pages/PortfolioPage';
import InvestmentSimulatorPage from './pages/InvestmentSimulatorPage';
import FinancialReportsPage from './pages/FinancialReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import AchievementsPage from './pages/AchievementsPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/income"
            element={
              <ProtectedRoute>
                <IncomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budget"
            element={
              <ProtectedRoute>
                <BudgetPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <GoalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-coach"
            element={
              <ProtectedRoute>
                <AICoachPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial-health"
            element={
              <ProtectedRoute>
                <FinancialHealthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/market"
            element={
              <ProtectedRoute>
                <MarketPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock-analysis"
            element={
              <ProtectedRoute>
                <StockAnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mutual-funds"
            element={
              <ProtectedRoute>
                <MutualFundsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk-assessment"
            element={
              <ProtectedRoute>
                <RiskAssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <InvestmentRecommendationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <PortfolioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulator"
            element={
              <ProtectedRoute>
                <InvestmentSimulatorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <FinancialReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <AchievementsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
