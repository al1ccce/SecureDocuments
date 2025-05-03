const express = require ('express')
const router = express.Router();
const authMiddleware = require('../middleware/auth')
const {getProf, updateProf, getDocs, getAllDocs} = require('../controllers/user')

router.get('/me', authMiddleware, getProf);
router.put('/me', authMiddleware, updateProf);
router.get('/me/documents', authMiddleware, getDocs);
router.get('/documents', authMiddleware, getAllDocs);

module.exports = router;