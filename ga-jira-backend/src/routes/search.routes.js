const router = require('express').Router();
const ctrl = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, ctrl.globalSearch);

module.exports = router;
