const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');


router.use(authMiddleware);

router.get('/queue', roleMiddleware(['ADMIN', 'MANAGER', 'COUNSELOR']), callController.getQueue);
router.post('/enqueue', roleMiddleware(['ADMIN', 'MANAGER', 'COUNSELOR']), callController.enqueue);
router.post('/cancel/:id', roleMiddleware(['ADMIN', 'MANAGER', 'COUNSELOR']), callController.cancel);

router.get('/logs', roleMiddleware(['ADMIN', 'MANAGER', 'COUNSELOR']), callController.getLogs);
router.get('/logs/:id', roleMiddleware(['ADMIN', 'MANAGER', 'COUNSELOR']), callController.getLogDetail);

router.get('/settings', roleMiddleware(['ADMIN', 'MANAGER']), callController.getSettings);
router.put('/settings', roleMiddleware(['ADMIN', 'MANAGER']), callController.updateSettings);

module.exports = router;
