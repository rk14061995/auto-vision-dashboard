import React, { useState, useEffect } from 'react';
import './ProjectLimitModal.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

function ProjectLimitModal({ isOpen, onClose, userLimits, onUpgrade }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchPlans();
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/plans`);
      
      if (response.ok) {
        const plansData = await response.json();
        setPlans(plansData);
      } else {
        console.error('Failed to fetch plans, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = (planId) => {
    // Redirect to specific plan checkout page
    window.open(`${API_BASE_URL}/checkout/${planId}`, '_blank');
    onUpgrade();
  };

  if (!isOpen) return null;

  return (
    <div className="project-limit-modal-overlay">
      <div className="project-limit-modal">
        <div className="project-limit-header">
          <h2>Project Limit Reached</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="project-limit-content">
          <div className="limit-info">
            <div className="usage-stats">
              <div className="stat-item">
                <span className="stat-label">Projects Used:</span>
                <span className="stat-value">{userLimits.projectsUsed}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Project Limit:</span>
                <span className="stat-value">{userLimits.projectLimit}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Remaining:</span>
                <span className="stat-value remaining">{userLimits.projectsRemaining}</span>
              </div>
            </div>
            
            <div className="plan-info">
              <p>Current Plan: <strong>{userLimits.planType}</strong></p>
            </div>
          </div>

          <div className="upgrade-prompt">
            <h3>Upgrade Your Plan</h3>
            <p>You've reached your project limit. Choose a plan to continue creating amazing car customizations!</p>
            
            {loading ? (
              <div className="loading-plans">Loading plans...</div>
            ) : (
              <div className="plans-grid">
                {plans
                  .filter(plan => plan.id !== 'free')
                  .map((plan) => (
                    <div key={plan.id} className={`plan-card ${plan.badge ? `plan-card--${plan.badge}` : ''}`}>
                      {plan.badge && (
                        <div className="plan-badge">{plan.badge === 'popular' ? 'Popular' : 'Best Value'}</div>
                      )}
                      <div className="plan-header">
                        <h4 className="plan-name">{plan.name}</h4>
                        <div className="plan-price">
                          <span className="price-amount">{plan.formattedPrice}</span>
                          <span className="price-period">/month</span>
                        </div>
                      </div>
                      <div className="plan-projects">
                        <strong>{plan.projectLimit === -1 ? 'Unlimited' : plan.projectLimit}</strong> Projects
                      </div>
                      <ul className="plan-features">
                        {plan.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                      <button 
                        className="btn btn-primary plan-upgrade-btn"
                        onClick={() => handleUpgradeClick(plan.id)}
                      >
                        Upgrade to {plan.name}
                      </button>
                    </div>
                  ))}
                </div>
            )}
          </div>
        </div>

        <div className="project-limit-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectLimitModal;
