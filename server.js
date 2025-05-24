const { createClient } = require('bedrock-protocol');
const express = require('express');
const app = express();
const PORT = 3000;

let bot;
let reconnectTimeout; // To track the reconnect timeout and ensure only one is active
let disconnectAtNight=true;
let isStarted=true;

app.get('/keep-alive', (req, res) => {
    res.json({
    "message":"Working"
  });
});

app.get('/toggle', (req, res) => {
    if(disconnectAtNight){
      disconnectAtNight=false;
      res.json({
        "message":"Stable Mode"
      });
    }
    else{
      disconnectAtNight=true;
      res.json({
        "message":"Disconnecting Mode"
      });
    }
});

app.get('/start', (req, res) => {
    startBot();
    isStarted = true;
    res.json({
      "message": "Bot started"
    });
});


app.get('/stop', (req, res) => {
    try{
	bot.disconnect("Turning off");
    }
    catch(err){
	    console.log(err);
	}
    isStarted=false;
	res.json({
      "message": "Bot stopped"
    });
});

console.log("Night Disconnecting Mode");

// Function to start/restart the bot
function startBot() {
  if (bot) {
    console.log('🔌 Bot already connected or reconnecting. Disconnecting previous bot...');
    bot.disconnect('Restarting due to time cycle change');
  }

  bot = createClient({
    host: 'FaltuMPE.aternos.me', // Server IP
    port: 58163,                 // Server port
    username: 'OakCrowd9366',    // Bot's name
    offline: false               // Set true for offline-mode if using LAN
  });

  console.log('🔌 Bot connected.');

  bot.on('spawn', () => {
    console.log('✅ Bot has spawned.');
    
  });

  // Listen for world time updates
  bot.on('set_time', (packet) => {
    const time = packet.time;
    const cycleTime = time % 24000; // Get time in a 0-24000 cycle
    console.log(`⏱️ World time (in cycle): ${cycleTime}`);

    // Check if it's night (time between 13000 and 23000 in a 24000 cycle)
    if (cycleTime >= 13000 && cycleTime < 23000 && disconnectAtNight) {
      console.log('🌙 Night detected — disconnecting bot.');
      bot.disconnect('Nighttime - Disconnecting');
      clearTimeout(reconnectTimeout); // Clear any previous reconnect timeout
      reconnectTimeout = setTimeout(() => {
        // After 30 seconds, reconnect the bot
        console.log('⏱️ Reconnecting bot after 30 seconds...');
        startBot();
      }, 30000); // Wait 30 seconds before reconnecting
    } else if (cycleTime >= 0 && cycleTime < 13000) {
      console.log('☀️ Day detected');
	    }
  });

  bot.on('disconnect', (reason) => {
    console.log(`❌ Bot disconnected: ${reason}`);
    // Retry logic after disconnection
    clearTimeout(reconnectTimeout); // Ensure we don't stack up retries
    reconnectTimeout = setTimeout(() => {
      console.log('🔁 Retrying to connect...');
      startBot();
    }, 30000); // Retry after 30 seconds
  });

  bot.on('text', (packet) => {
    console.log(`[Chat] ${packet.source_name}: ${packet.message}`);
  });
}

startBot();

app.listen(PORT, () => {
  console.log(`🌐 API running at http://localhost:${PORT}`);
});
