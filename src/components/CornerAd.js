import React, { useEffect, useCallback } from 'react';
import './CornerAd.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

function CornerAd({ position, ad }) {
  // Track view when ad is displayed or changes
  const trackView = useCallback(async (adId) => {
    try {
      await fetch(`${API_BASE_URL}/api/ads/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adId,
          action: 'view'
        })
      });
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  }, []);

  // Track click when ad is clicked
  const trackClick = useCallback(async (adId) => {
    try {
      await fetch(`${API_BASE_URL}/api/ads/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adId,
          action: 'click'
        })
      });
    } catch (err) {
      console.error('Failed to track click:', err);
    }
  }, []);

  // Track view when ad changes
  useEffect(() => {
    if (ad && ad._id) {
      trackView(ad._id);
    }
  }, [ad, trackView]);

  const handleAdClick = async () => {
    if (ad && ad._id) {
      // Track the click
      await trackClick(ad._id);
      
      // Open contact info or ad URL in new tab
      if (ad.contactInfo) {
        // If it's a phone number, open phone dialer
        if (/^\+?[\d\s-()]+$/.test(ad.contactInfo)) {
          window.open(`tel:${ad.contactInfo.replace(/[^\d+]/g, '')}`, '_blank');
        } 
        // If it's an email, open email client
        else if (ad.contactInfo.includes('@')) {
          window.open(`mailto:${ad.contactInfo}`, '_blank');
        }
        // Otherwise, try to open as URL
        else {
          const url = ad.contactInfo.startsWith('http') ? ad.contactInfo : `https://${ad.contactInfo}`;
          window.open(url, '_blank');
        }
      }
    }
  };

  if (!ad) return null;

  return (
    <div 
      className={`corner-ad corner-ad--${position} corner-ad--clickable`}
      onClick={handleAdClick}
      title="Click to contact advertiser"
    >
      <div className="corner-ad-content">
        <div className="corner-ad-header">
          <span className="corner-ad-title">{ad.shopName}</span>
          <span className="corner-ad-type">{ad.adType}</span>
        </div>
        {ad.images && ad.images.length > 0 && (
          <img src={ad.images[0]} alt={ad.shopName} className="corner-ad-image" />
        )}
        <div className="corner-ad-footer">
          <span className="corner-ad-contact">{ad.contactInfo}</span>
          <div className="corner-ad-stats">
            <span className="corner-ad-views">Views: {ad.views || 0}</span>
            <span className="corner-ad-clicks">Clicks: {ad.clicks || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CornerAd;
