// routes/cookieRoutes.js
import express from 'express';
import { getCookieName,getUserCookieId } from '../controllers/cookieController.js';
import { authenticationUser } from '../middleware/isLogged.js';
const router = express.Router();

router.get('/getCookieName', getCookieName);
router.get('/getUserCookieId',authenticationUser, getUserCookieId);
export default router;
