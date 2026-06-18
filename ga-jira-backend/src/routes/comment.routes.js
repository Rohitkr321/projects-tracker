const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/comment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authenticate);
router.post('/', upload.array('attachments', 5), ctrl.create);
router.patch('/:commentId', ctrl.update);
router.delete('/:commentId', ctrl.delete);

module.exports = router;
