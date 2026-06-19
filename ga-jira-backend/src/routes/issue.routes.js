const router = require('express').Router();
const ctrl = require('../controllers/issue.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/:issueId', ctrl.getById);
router.patch('/:issueId', ctrl.update);
router.delete('/:issueId', ctrl.delete);
router.patch('/:issueId/position', ctrl.updatePosition);
router.post('/:issueId/watch', ctrl.addWatcher);
router.delete('/:issueId/watch', ctrl.removeWatcher);
router.post('/:issueId/dependencies', ctrl.addDependency);
router.delete('/:issueId/dependencies/:depId', ctrl.removeDependency);

router.get('/:issueId/attachments', ctrl.getAttachments);
router.post('/:issueId/attachments/presign', ctrl.getPresignedUrl);   // step 1: get S3 presigned URL
router.post('/:issueId/attachments/image', ctrl.confirmImageUpload);  // step 2: save record after S3 upload
router.post('/:issueId/attachments', ctrl.uploadAttachments);         // URL links (JSON)
router.delete('/:issueId/attachments/:attachmentId', ctrl.deleteAttachment);

module.exports = router;
