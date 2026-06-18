const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/board.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getBoards);
router.get('/:boardId/issues', ctrl.getBoardIssues);
router.patch('/:boardId/columns/order', ctrl.updateColumnOrder);

module.exports = router;
