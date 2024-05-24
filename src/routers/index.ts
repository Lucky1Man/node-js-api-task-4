import express from 'express';
import ping from 'src/controllers/ping';
import testimonies from './testimonies';

const router = express.Router();

router.get('/ping', ping);

router.use('/testimonies', testimonies);

export default router;
