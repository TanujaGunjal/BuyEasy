const express = require('express');
const { getReviews, addReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.route('/')
  .get(getReviews)
  .post(protect, addReview);

module.exports = router;
