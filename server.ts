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

    // Geo-Location Data API (Structured with State > Cities)
    interface GeoState {
      name: string;
      cities: string[];
    }

    interface GeoCountry {
      name: string;
      states: GeoState[];
    }

    const geoData: Record<string, GeoCountry> = {
      'US': {
        name: 'USA',
        states: [
          { name: 'CA', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento'] },
          { name: 'NY', cities: ['New York City', 'Buffalo', 'Rochester'] },
          { name: 'TX', cities: ['Houston', 'Austin', 'Dallas', 'San Antonio'] },
          { name: 'FL', cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'] }
        ]
      },
      'TH': {
        name: 'Thailand',
        states: [
          { name: 'Bangkok', cities: ['Bang Rak', 'Watthana', 'Pathum Wan', 'Chatuchak', 'Phra Nakhon', 'Huai Khwang', 'Khlong Toei'] },
          { name: 'Chiang Mai', cities: ['Mueang Chiang Mai', 'Mae Rim', 'Hang Dong', 'Suthep', 'San Sai'] },
          { name: 'Phuket', cities: ['Patong', 'Phuket Town', 'Rawai', 'Karon', 'Chalong', 'Thalang'] },
          { name: 'Chon Buri', cities: ['Pattaya', 'Mueang Chon Buri', 'Bang Saen', 'Si Racha'] },
          { name: 'Surat Thani', cities: ['Ko Samui', 'Ko Pha-ngan', 'Mueang Surat Thani', 'Ko Tao'] },
          { name: 'Krabi', cities: ['Ao Nang', 'Krabi Town', 'Ko Lanta', 'Phi Phi Islands'] },
          { name: 'Khon Kaen', cities: ['Mueang Khon Kaen', 'Ban Phai', 'Chum Phae'] },
          { name: 'Nakhon Ratchasima', cities: ['Mueang Nakhon Ratchasima', 'Pak Chong', 'Sikhio'] }
        ]
      },
      'GB': {
        name: 'United Kingdom',
        states: [
          { name: 'England', cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds'] },
          { name: 'Scotland', cities: ['Glasgow', 'Edinburgh', 'Aberdeen'] }
        ]
      }
    };

    app.get('/api/geo/countries', (req, res) => {
      const countries = Object.keys(geoData).map(code => ({
        code,
        name: geoData[code].name
      }));
      res.json(countries);
    });

    app.get('/api/geo/states/:countryCode', (req, res) => {
      const input = req.params.countryCode.toUpperCase();
      let country = geoData[input];
      if (!country) {
        country = Object.values(geoData).find(g => g.name.toUpperCase() === input);
      }
      
      if (country) {
        res.json(country.states.map(s => s.name));
      } else {
        res.json([]);
      }
    });

    app.get('/api/geo/cities/:countryCode/:stateName', (req, res) => {
      const cInput = req.params.countryCode.toUpperCase();
      const sInput = req.params.stateName;

      let country = geoData[cInput];
      if (!country) {
        country = Object.values(geoData).find(g => g.name.toUpperCase() === cInput);
      }

      if (country) {
        const state = country.states.find(s => s.name === sInput);
        res.json(state ? state.cities : []);
      } else {
        res.json([]);
      }
    });

    // Scrape Task Manager
    interface ScrapeTask {
      id: string;
      status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
      completed: number;
      total: number;
      logs: string[];
      cities: string[];
      currentCityIndex: number;
    }

    const scrapeTasks: Record<string, ScrapeTask> = {};

    app.post('/api/scrape/start', (req, res) => {
      const { country, state, keyword, headless } = req.body;
      const taskId = `scrape_${Date.now()}`;
      
      // Look up cities for this state
      let countryObj = geoData[country.toUpperCase()];
      if (!countryObj) countryObj = Object.values(geoData).find(g => g.name.toUpperCase() === country.toUpperCase());
      
      const stateObj = countryObj?.states.find(s => s.name === state);
      const cities = stateObj ? stateObj.cities : [state]; // Fallback to state name if no cities found

      scrapeTasks[taskId] = {
        id: taskId,
        status: 'running',
        completed: 0,
        total: cities.length,
        logs: [`Initiated scan for ${state} in ${countryObj?.name || country}. Found ${cities.length} priority districts.`],
        cities,
        currentCityIndex: 0
      };

      // Mock the progression
      const runNextCity = (tId: string) => {
        const task = scrapeTasks[tId];
        if (!task || task.status !== 'running') return;

        if (task.currentCityIndex < task.cities.length) {
          const city = task.cities[task.currentCityIndex];
          task.logs.push(`[Worker] Starting deep scrape in ${city}...`);
          
          // Fast-forward after 3 seconds
          setTimeout(() => {
            const currentTask = scrapeTasks[tId];
            if (currentTask && currentTask.status === 'running') {
              currentTask.completed += 1;
              currentTask.logs.push(`[Worker] Done with ${city}. Found ${5 + Math.floor(Math.random() * 15)} targets.`);
              currentTask.currentCityIndex += 1;
              
              if (currentTask.currentCityIndex >= currentTask.total) {
                currentTask.status = 'completed';
                currentTask.logs.push(`[System] Bulk scrape completed for ${state}.`);
              } else {
                runNextCity(tId);
              }
            }
          }, 3000);
        }
      };

      runNextCity(taskId);
      res.json({ taskId });
    });

    app.get('/api/scrape/status/:taskId', (req, res) => {
      const task = scrapeTasks[req.params.taskId];
      if (task) {
        res.json(task);
      } else {
        res.status(404).json({ error: 'Task not found' });
      }
    });

    app.post('/api/scrape/pause/:taskId', (req, res) => {
      if (scrapeTasks[req.params.taskId]) {
        scrapeTasks[req.params.taskId].status = 'paused';
        scrapeTasks[req.params.taskId].logs.push(`[System] Worker paused by user.`);
        res.json({ status: 'ok' });
      }
    });

    app.post('/api/scrape/resume/:taskId', (req, res) => {
      if (scrapeTasks[req.params.taskId]) {
        scrapeTasks[req.params.taskId].status = 'running';
        scrapeTasks[req.params.taskId].logs.push(`[System] Worker resumed.`);
        res.json({ status: 'ok' });
      }
    });

    app.post('/api/scrape/cancel/:taskId', (req, res) => {
      if (scrapeTasks[req.params.taskId]) {
        scrapeTasks[req.params.taskId].status = 'cancelled';
        scrapeTasks[req.params.taskId].logs.push(`[System] Worker terminated.`);
        res.json({ status: 'ok' });
      }
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
