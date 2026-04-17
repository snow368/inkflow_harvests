import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  try {
    console.log('Starting server initialization...');
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    // API Routes
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'InkFlow AI Server is running' });
    });

    // Automation Command Queue (Mock for local Playwright script)
    const automationQueue: any[] = [];

    app.post('/api/automation/start', (req, res) => {
      const { artistId, accountId, behaviorProfile, artistHandle, accountHandle, humanization } = req.body;
      
      // 1. Check Sleep Cycle (Hard Stop)
      const currentHour = new Date().getHours();
      const sleepStart = 23; // 11 PM
      const sleepEnd = 7;    // 7 AM
      const isSleeping = currentHour >= sleepStart || currentHour < sleepEnd;

      if (isSleeping) {
        console.log(`[Automation] REJECTED: @${accountHandle} is currently in SLEEP mode (Night Cycle).`);
        return res.status(403).json({ 
          status: 'rejected', 
          reason: 'account_sleeping',
          message: 'Account is in mandatory night-time sleep cycle to prevent detection.' 
        });
      }

      // 2. Check for Random "Coffee Breaks" during work hours
      // 15% chance that the account is currently taking a break
      const isOnBreak = Math.random() < 0.15;
      if (isOnBreak) {
        const breakDuration = 5 + Math.floor(Math.random() * 25); // 5-30 mins
        console.log(`[Automation] DELAYED: @${accountHandle} is taking a random break for ${breakDuration}m.`);
        return res.status(429).json({ 
          status: 'delayed', 
          reason: 'taking_break',
          message: `Account is taking a natural break. Try again in ${breakDuration} minutes.` 
        });
      }

      // 3. Anti-Ban Behavioral Protocol: Dynamic Jitter Calculation
      const jitterRange = humanization?.jitterRange || [30, 180];
      const getJitter = () => Math.floor(Math.random() * (jitterRange[1] - jitterRange[0] + 1)) + jitterRange[0];

      const command = {
        id: `cmd_${Date.now()}`,
        artistId,
        accountId,
        artistHandle,
        accountHandle,
        behaviorProfile,
        timestamp: new Date().toISOString(),
        humanization,
        protocol: {
          steps: [
            { action: 'simulate_app_open', delay: getJitter() },
            { action: 'browse_feed', duration: `${10 + Math.floor(Math.random() * 20)}s`, delay: getJitter() },
            { action: 'enter_profile', target: artistHandle, delay: getJitter() },
            { action: 'random_scroll', duration: `${5 + Math.floor(Math.random() * 15)}s`, delay: getJitter() },
            // Randomized Like Count
            ...Array.from({ length: humanization?.sessionLikes || 1 }).map((_, i) => ({
              action: 'like',
              target: i === 0 ? 'recent_post' : 'random_post',
              delay: getJitter()
            })),
            { 
              action: 'comment', 
              enabled: (behaviorProfile === 'active' || behaviorProfile === 'warmup') && (humanization?.sessionComments > 0),
              type: 'ai_generated', 
              delay: getJitter() 
            },
            { action: 'exit_profile', delay: getJitter() },
            { action: 'random_scroll', duration: '10s', delay: getJitter() }
          ],
          jitterRange: jitterRange
        }
      };

      automationQueue.push(command);
      console.log(`[Automation] Command queued: @${accountHandle} -> @${artistHandle} (${behaviorProfile})`);
      res.json({ status: 'queued', commandId: command.id });
    });

    app.get('/api/automation/poll', (req, res) => {
      // Local Playwright script would poll this endpoint
      const commands = [...automationQueue];
      automationQueue.length = 0; // Clear queue after polling
      res.json({ commands });
    });

    // Vite Integration
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('CRITICAL: Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(err => {
  console.error('CRITICAL: Unhandled error during startup:', err);
  process.exit(1);
});
