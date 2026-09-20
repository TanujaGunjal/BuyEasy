# Payments Policy

## Accepted Payment Methods

BuyEasy accepts the following payment methods at checkout:

| Method | Notes |
|---|---|
| Credit Card | Visa, Mastercard, American Express |
| Debit Card | All major Indian debit cards |
| PayPal | Available for international orders |
| Cash on Delivery | Available for select pin codes within India |

## How Card Payments Work

When you select Credit or Debit Card at checkout:

1. You will be redirected to a secure payment page powered by **Stripe**.
2. Enter your card number, expiry date, and CVV. BuyEasy never stores or sees your raw card details — all card data is handled directly by Stripe's secure infrastructure.
3. Once your payment is authorised, your order is confirmed and you will receive a confirmation email.

Your card is charged in **US Dollars (USD)**. If your card is denominated in a different currency, your bank will apply its standard conversion rate.

## Payment Security

- All transactions are processed over HTTPS with TLS encryption.
- BuyEasy is PCI-DSS compliant through its use of Stripe's hosted payment elements.
- Your full card number is never stored on BuyEasy's servers.
- The Stripe publishable key (used in the browser) is separate from the secret key, which never leaves our backend servers.

## Payment Failures

If your payment fails:
- Check that your card details are entered correctly.
- Ensure your card has sufficient funds.
- Contact your bank if you are receiving a "card declined" message — some banks block international or online transactions by default.
- Try a different payment method if the issue persists.

A failed payment does **not** create an order. You will need to retry from your cart.

## Viewing Your Payment History

Log in and go to **My Orders** to see the payment status of each order. Payment statuses are:

| Status | Meaning |
|---|---|
| Pending | Payment not yet completed |
| Completed | Payment successful |
| Refunded | Refund has been issued to your original payment method |
| Failed | Payment was not successful |
