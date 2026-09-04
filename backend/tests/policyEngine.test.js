/**
 * policyEngine.test.js
 *
 * 6 unit tests covering every branch of checkReturnEligibility.
 * These tests prove policy correctness without running the AI.
 *
 * Run: npm test
 */
const {
  checkReturnEligibility,
  RETURN_WINDOW_DAYS,
} = require('../services/policyEngine');

// Helper: build a minimal order object
function makeOrder(overrides = {}) {
  return {
    orderStatus: 'Delivered',
    deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    orderItems: [
      {
        product: { category: 'Electronics' },
        name: 'Test Product',
        quantity: 1,
        price: 999,
      },
    ],
    ...overrides,
  };
}

describe('policyEngine.checkReturnEligibility', () => {
  // Test 1: Happy path — eligible
  test('returns eligible=true for delivered order within 30-day window with normal item', () => {
    const order = makeOrder();
    const result = checkReturnEligibility(order);
    expect(result.eligible).toBe(true);
    expect(result.daysSinceDelivery).toBeLessThan(RETURN_WINDOW_DAYS);
  });

  // Test 2: Return window expired
  test('returns eligible=false when more than 30 days since delivery', () => {
    const order = makeOrder({
      deliveredAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
    });
    const result = checkReturnEligibility(order);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/Return window expired/);
    expect(result.daysSinceDelivery).toBeGreaterThan(RETURN_WINDOW_DAYS);
  });

  // Test 3: Not yet delivered
  test('returns eligible=false when order is not in Delivered status', () => {
    const order = makeOrder({ orderStatus: 'Processing', deliveredAt: null });
    const result = checkReturnEligibility(order);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/not yet delivered/);
  });

  // Test 4: Non-returnable category (Food)
  test('returns eligible=false when order contains a Food item', () => {
    const order = makeOrder({
      orderItems: [
        {
          product: { category: 'Food' },
          name: 'Snack Box',
          quantity: 2,
          price: 199,
        },
      ],
    });
    const result = checkReturnEligibility(order);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/non-returnable/);
  });

  // Test 5: deliveredAt is null — must NOT fall back to any other date
  test('returns eligible=false when deliveredAt is null (manual review required)', () => {
    const order = makeOrder({
      orderStatus: 'Delivered',
      deliveredAt: null,
    });
    const result = checkReturnEligibility(order);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/manual review required/);
  });

  // Test 6: order itself is null (bad input)
  test('returns eligible=false when order is null', () => {
    const result = checkReturnEligibility(null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/Order not found/);
  });
});
