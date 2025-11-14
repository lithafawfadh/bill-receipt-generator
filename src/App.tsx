import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { SalesReceipt } from './components/SalesReceipt';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<SalesReceipt />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;