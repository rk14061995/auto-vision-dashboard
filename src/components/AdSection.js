import React, { useEffect, useState } from 'react';
import './AdSection.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

// Simple ad card for marketing
function AdCard({ ad }) {
  return (
    <div className="ad-card">
      <div className="ad-header">
        <strong>{ad.shopName}</strong>
        <span className="ad-type">{ad.adType}</span>
      </div>
      <div className="ad-body">
        <p>{ad.shopDescription}</p>
        {ad.images && ad.images.length > 0 && (
          <img src={ad.images[0]} alt={ad.shopName} className="ad-image" />
        )}
      </div>
      <div className="ad-footer">
        <span>Contact: {ad.contactInfo}</span>
      </div>
    </div>
  );
}

export default function AdSection() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAds() {
      try {
        // Fetch random ads from the web app API
        const res = await fetch(`${API_BASE_URL}/api/ads/random`);
        if (res.ok) {
          const data = await res.json();
          setAds(data);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch ads:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAds();
  }, []);

  if (loading) return <div>Loading ads...</div>;
  if (!ads.length) return <div>No ads to show.</div>;

  return (
    <div className="ad-section">
      <h2>Featured Ads</h2>
      <div className="ad-list">
        {ads.map((ad) => (
          <AdCard key={ad._id} ad={ad} />
        ))}
      </div>
    </div>
  );
}
