/**
 * سوق مزاد - API Server
 * Express + Socket.IO
 */

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http, { createServer } from 'http';
import morgan from 'morgan';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3021', 'http://localhost:3022'],
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3021', 'http://localhost:3022'],
}));
app.use(morgan('dev'));

// ------------------------------------------------------------
// Demo Proxy
// في مرحلة الديمو: apps/web يحتوي فعلياً معظم الـ API routes.
// لكي يبقى apps/api منفصل (على 3020) بدون كسر المشروع، نقوم بتمرير
// أي طلب /api/* إلى apps/web مؤقتاً.
// ------------------------------------------------------------
const WEB_TARGET_URL = process.env.WEB_TARGET_URL || 'http://localhost:3021';

function proxyToWeb(req: express.Request, res: express.Response) {
    const target = new URL(req.originalUrl, WEB_TARGET_URL);

    const proxyReq = http.request(
        {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port,
            method: req.method,
            path: `${target.pathname}${target.search}`,
            headers: {
                ...req.headers,
                host: target.host,
            },
        },
        (proxyRes) => {
            if (proxyRes.statusCode) {
                res.status(proxyRes.statusCode);
            }
            Object.entries(proxyRes.headers).forEach(([key, value]) => {
                if (typeof value !== 'undefined') {
                    res.setHeader(key, value as string);
                }
            });
            proxyRes.pipe(res);
        },
    );

    proxyReq.on('error', (err) => {
        res.status(502).json({
            error: 'Bad Gateway',
            message: 'Proxy to web failed',
            details: err instanceof Error ? err.message : String(err),
            target: WEB_TARGET_URL,
        });
    });

    req.pipe(proxyReq);
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api', (req, res) => {
    res.json({ message: 'سوق مزاد API', version: '1.0.0' });
});

// Proxy any other /api/* routes to apps/web (demo mode)
app.use('/api', (req, res) => {
    // keep GET /api above; everything else proxies
    if (req.method === 'GET' && (req.path === '/' || req.path === '')) {
        return res.json({ message: 'سوق مزاد API', version: '1.0.0' });
    }
    return proxyToWeb(req, res);
});

// Parse JSON for any non-proxied routes
app.use(express.json());

// Socket.IO
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
const PORT = Number(process.env.PORT || process.env.API_PORT || 3020);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
});

export { app, io };

