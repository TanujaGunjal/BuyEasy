/**
 * StripeCheckout.js
 *
 * Handles the Stripe client-side payment flow for a BuyEasy order.
 *
 * Flow:
 *   1. On mount, calls POST /api/payments/create-intent → gets clientSecret
 *   2. Renders Stripe PaymentElement (card input hosted by Stripe — no raw card data touches BuyEasy)
 *   3. On submit, calls stripe.confirmPayment → Stripe processes the payment
 *   4. On success, calls POST /api/payments/:paymentId/process with the PaymentIntent ID
 *      → backend verifies the intent status with Stripe and marks Order + Payment as Paid
 *
 * SECURITY NOTES:
 *   - REACT_APP_STRIPE_PUBLISHABLE_KEY is the only Stripe key exposed to the browser.
 *   - The secret key NEVER leaves the backend.
 *   - BuyEasy never touches raw card numbers — Stripe's embedded iframe handles all PCI-scope input.
 *   - The authoritative order amount is computed by the backend, not from React state.
 */

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import api from '../services/api';

// Initialize Stripe outside the component so it is not re-created on each render.
// loadStripe requires a string — guard against undefined (e.g. missing env var).
const stripePublicKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

// ─── Inner form component ──────────────────────────────────────────────────────
const CheckoutForm = ({ paymentId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    // Confirm the payment with Stripe
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Notify backend to verify the intent and mark the order paid
      try {
        await api.post(`/payments/${paymentId}/process`, {
          paymentIntentId: paymentIntent.id,
        });
        onSuccess();
      } catch (err) {
        setError(err.response?.data?.message || 'Payment confirmed but DB update failed. Please contact support.');
        setProcessing(false);
      }
    } else {
      setError('Payment was not completed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <PaymentElement />
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%' }}
        disabled={!stripe || processing}
      >
        {processing ? 'Processing...' : '💳 Pay Now'}
      </button>

      <p style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
        🔒 Payments are secured by Stripe. BuyEasy never stores your card details.
        <br />
        <strong>Test card:</strong> 4242 4242 4242 4242 · Any future date · Any CVC
      </p>
    </form>
  );
};

// ─── Outer wrapper — creates PaymentIntent and loads Elements ─────────────────
const StripeCheckout = ({ orderId, paymentId, onSuccess }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loadingIntent, setLoadingIntent] = useState(true);
  const [intentError, setIntentError] = useState('');

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        const res = await api.post('/payments/create-intent', { orderId });
        setClientSecret(res.data.clientSecret);
      } catch (err) {
        setIntentError(
          err.response?.data?.message || 'Could not initialize payment. Please try again.'
        );
      } finally {
        setLoadingIntent(false);
      }
    };

    fetchClientSecret();
  }, [orderId]);

  if (loadingIntent) {
    return <div className="loading">Initializing secure payment...</div>;
  }

  if (intentError) {
    return <div className="alert alert-danger">{intentError}</div>;
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <h3 style={{ marginBottom: '16px' }}>💳 Complete Your Payment</h3>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#4F46E5',
              borderRadius: '8px',
            },
          },
        }}
      >
        <CheckoutForm paymentId={paymentId} onSuccess={onSuccess} />
      </Elements>
    </div>
  );
};

export default StripeCheckout;
