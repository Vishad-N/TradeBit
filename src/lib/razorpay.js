let script;

/** Loads Razorpay's checkout script once. */
export const loadRazorpay = () => {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  script ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => { script = null; reject(new Error('Could not load the payment window. Check your connection and try again.')); };
    document.body.appendChild(s);
  });
  return script;
};

/**
 * Opens Razorpay checkout for a server-created order and resolves once the browser callback has been verified by `onPaid`.
 * Rejects with `{ dismissed: true }` when the buyer closes the window, or with the gateway's own message on failure.
 */
export async function openCheckout({ order, description, user, onPaid }) {
  await loadRazorpay();
  await new Promise((resolve, reject) => {
    // Razorpay fires `payment.failed` for every failed attempt but keeps the window open so the buyer can retry, so a failure
    // is only remembered here. It is reported if the buyer then closes the window without paying.
    let lastFailure = '';
    let paying = false;
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'TradeBit India',
      description,
      prefill: { name: user?.name, email: user?.email },
      theme: { color: '#B8D83D' },
      handler: async (r) => {
        paying = true; // paid: closing the window from here on is not a cancellation
        try { await onPaid(r); resolve(); } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => { if (!paying) reject(lastFailure ? new Error(lastFailure) : Object.assign(new Error(''), { dismissed: true })); } },
    });
    rzp.on('payment.failed', (r) => { lastFailure = r?.error?.description || 'The payment did not go through.'; });
    rzp.open();
  });
}
