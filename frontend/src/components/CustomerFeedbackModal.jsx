import React, { useState } from 'react';
import { Star, X, Check, Heart } from 'lucide-react';
import { api } from '../services/api';

export default function CustomerFeedbackModal({ isOpen, onClose, customerId, sessionId, tableNumber }) {
  const [ratingOverall, setRatingOverall] = useState(5);
  const [ratingFood, setRatingFood] = useState(5);
  const [ratingService, setRatingService] = useState(5);
  const [ratingAmbience, setRatingAmbience] = useState(5);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.submitFeedback({
        customer_id: customerId,
        session_id: sessionId,
        rating_overall: ratingOverall,
        rating_food: ratingFood,
        rating_service: ratingService,
        rating_ambience: ratingAmbience,
        comments
      });
      setSubmitted(true);
    } catch (err) {
      alert('Error submitting feedback: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1400 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>How Was Your Experience?</h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {tableNumber ? `${tableNumber} • ` : ''}Your review helps us craft perfection
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div style={{ padding: '30px 0', textAlign: 'center' }}>
            <Heart size={44} color="var(--accent-gold)" fill="var(--accent-gold)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Thank You So Much!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6, lineHeight: 1.4 }}>
              Your feedback has been saved. We hope to serve you again soon!
            </p>
            <button onClick={onClose} className="btn btn-primary btn-sm" style={{ marginTop: 20 }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Main Stars */}
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingOverall(star)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <Star
                      size={32}
                      color="var(--accent-gold)"
                      fill={star <= ratingOverall ? 'var(--accent-gold)' : 'transparent'}
                    />
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                {ratingOverall === 5 ? 'Exceptional Experience! ⭐⭐⭐⭐⭐' : `${ratingOverall} Stars`}
              </div>
            </div>

            {/* Sub-ratings */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: '0.8rem'
            }}>
              {[
                { label: 'Food Taste & Presentation', val: ratingFood, set: setRatingFood },
                { label: 'Service Speed & Hospitality', val: ratingService, set: setRatingService },
                { label: 'Cafe Ambience & Comfort', val: ratingAmbience, set: setRatingAmbience },
              ].map((sub, sidx) => (
                <div key={sidx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{sub.label}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => sub.set(st)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2 }}
                      >
                        <Star
                          size={14}
                          color="var(--accent-gold)"
                          fill={st <= sub.val ? 'var(--accent-gold)' : 'transparent'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Comments */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                What dishes did you enjoy the most?
              </label>
              <textarea
                rows={3}
                placeholder="Loved the hazelnut cappuccino and woodfired pizza..."
                value={comments}
                onChange={e => setComments(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
