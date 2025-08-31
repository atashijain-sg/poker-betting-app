require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const Parser = require('rss-parser');
const parser = new Parser();
const http = require('http');
const socketIo = require('socket.io');

// Import Vitally services
const VitallyService = require('./services/vitally');
const DataProcessor = require('./services/dataProcessor');
const HealthScorer = require('./services/healthScorer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3002', 'http://127.0.0.1:3002', 'http://localhost:3003', 'http://127.0.0.1:3003'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize services
let vitallyService = null;
const dataProcessor = new DataProcessor();
const healthScorer = new HealthScorer();

// Try to initialize Vitally service
try {
  if (process.env.VITALLY_API_KEY) {
    vitallyService = new VitallyService();
    console.log('✅ Vitally service initialized');
  } else {
    console.log('⚠️  VITALLY_API_KEY not found - Vitally features disabled');
  }
} catch (error) {
  console.error('❌ Failed to initialize Vitally service:', error.message);
}

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3002', 'http://127.0.0.1:3002', 'http://localhost:3003', 'http://127.0.0.1:3003'],
  credentials: true
}));

// Companies we track with detailed profiles
const COMPANY_PROFILES = {
  'Palantir': {
    name: 'Palantir Technologies',
    ticker: 'PLTR',
    founded: '2003',
    headquarters: 'Denver, Colorado',
    industry: 'Big Data Analytics',
    description: 'Builds software platforms for big data analytics',
    leadership: {
      ceo: {
        name: 'Alex Karp',
        title: 'Chief Executive Officer',
        twitter: '@alexkaarp',
        linkedin: 'https://linkedin.com/in/alex-karp-palantir'
      },
      cto: {
        name: 'Shyam Sankar',
        title: 'Chief Technology Officer',
        twitter: '@shyamsankar',
        linkedin: 'https://linkedin.com/in/shyam-sankar'
      }
    },
    keyPeople: [
      {
        name: 'Peter Thiel',
        title: 'Co-founder & Chairman',
        twitter: '@peterthiel',
        linkedin: 'https://linkedin.com/in/peterthiel'
      },
      {
        name: 'Joe Lonsdale',
        title: 'Co-founder',
        twitter: '@joelonsdale',
        linkedin: 'https://linkedin.com/in/joe-lonsdale'
      },
      {
        name: 'Stephen Cohen',
        title: 'Co-founder',
        twitter: null,
        linkedin: 'https://linkedin.com/in/stephen-cohen-palantir'
      }
    ]
  },
  'Okta': {
    name: 'Okta, Inc.',
    ticker: 'OKTA',
    founded: '2009',
    headquarters: 'San Francisco, California',
    industry: 'Identity & Access Management',
    description: 'Provides identity and access management solutions for enterprises',
    leadership: {
      ceo: {
        name: 'Todd McKinnon',
        title: 'Chief Executive Officer & Co-founder',
        twitter: '@toddmckinnon',
        linkedin: 'https://linkedin.com/in/toddmckinnon'
      },
      cto: {
        name: 'Hector Aguilar',
        title: 'Chief Technology Officer',
        twitter: '@hectoraguilar',
        linkedin: 'https://linkedin.com/in/hector-aguilar'
      }
    },
    keyPeople: [
      {
        name: 'Frederic Kerrest',
        title: 'Co-founder & COO',
        twitter: '@fkerrest',
        linkedin: 'https://linkedin.com/in/frederickerrest'
      },
      {
        name: 'Jacques Frederic Kerrest',
        title: 'Co-founder',
        twitter: '@fkerrest',
        linkedin: 'https://linkedin.com/in/frederickerrest'
      },
      {
        name: 'Brett Tighe',
        title: 'Chief Revenue Officer',
        twitter: '@bretttighe',
        linkedin: 'https://linkedin.com/in/bretttighe'
      }
    ]
  },
  'X': {
    name: 'X Corp. (formerly Twitter)',
    ticker: 'Private',
    founded: '2006',
    headquarters: 'San Francisco, California',
    industry: 'Social Media Platform',
    description: 'Social networking and microblogging platform',
    leadership: {
      ceo: {
        name: 'Elon Musk',
        title: 'Owner & CTO',
        twitter: '@elonmusk',
        linkedin: 'https://linkedin.com/in/elonrmusk'
      },
      cto: {
        name: 'Elon Musk',
        title: 'Chief Technology Officer',
        twitter: '@elonmusk',
        linkedin: 'https://linkedin.com/in/elonrmusk'
      }
    },
    keyPeople: [
      {
        name: 'Linda Yaccarino',
        title: 'CEO',
        twitter: '@lindayacc',
        linkedin: 'https://linkedin.com/in/lindayaccarino'
      },
      {
        name: 'Jack Dorsey',
        title: 'Co-founder (Former CEO)',
        twitter: '@jack',
        linkedin: 'https://linkedin.com/in/jackdorsey'
      },
      {
        name: 'Biz Stone',
        title: 'Co-founder',
        twitter: '@biz',
        linkedin: 'https://linkedin.com/in/biz'
      },
      {
        name: 'Evan Williams',
        title: 'Co-founder',
        twitter: '@ev',
        linkedin: 'https://linkedin.com/in/evanwilliams'
      }
    ]
  },
  'Workiva': {
    name: 'Workiva, Inc.',
    ticker: 'WK',
    founded: '2008',
    headquarters: 'Ames, Iowa',
    industry: 'Cloud Platform & ESG Reporting',
    description: 'Cloud platform for enterprise reporting, ESG, and compliance solutions',
    leadership: {
      ceo: {
        name: 'Julie Iskow',
        title: 'President & Chief Executive Officer',
        twitter: '@julieiskow',
        linkedin: 'https://linkedin.com/in/julieiskow'
      },
      cto: {
        name: 'Jeff Trom',
        title: 'Co-founder & Chief Technology Officer',
        twitter: '@jefftrom',
        linkedin: 'https://linkedin.com/in/jefftrom'
      }
    },
    keyPeople: [
      {
        name: 'Matt Rizai',
        title: 'Co-founder & Chairman',
        twitter: '@mattrizai',
        linkedin: 'https://linkedin.com/in/mattrizai'
      },
      {
        name: 'Stuart Miller',
        title: 'Chief Financial Officer',
        twitter: '@stumiller',
        linkedin: 'https://linkedin.com/in/stuart-miller-workiva'
      },
      {
        name: 'Marne Reed',
        title: 'Chief Marketing Officer',
        twitter: '@marnereed',
        linkedin: 'https://linkedin.com/in/marnereed'
      },
      {
        name: 'Julie Roehrkasse',
        title: 'Chief People Officer',
        twitter: '@julieR_workiva',
        linkedin: 'https://linkedin.com/in/julie-roehrkasse'
      }
    ]
  }
};

const COMPANIES = Object.keys(COMPANY_PROFILES);

// Poker Game Logic
class PokerGame {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.players = {};
    this.admin = null; // Track room creator
    this.currentPlayerIndex = 0;
    this.currentPlayer = null;
    this.gameStarted = false;
    this.gameEnded = false;
    this.winner = null;
    this.maxPlayers = 10;
    this.pot = 0;
    this.currentBet = 0;
    this.bettingRound = 0; // 0 = pre-flop, 1 = flop, 2 = turn, 3 = river
    this.bettingHistory = [];
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.dealerIndex = 0;
    this.createdAt = new Date();
    this.lastActivity = new Date();
    this.sessionTimeout = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  }

  addPlayer(playerId, playerName, isAdmin = false) {
    if (Object.keys(this.players).length >= this.maxPlayers) {
      throw new Error('Game is full');
    }

    // Check for duplicate player names (but allow same playerId to rejoin)
    const existingPlayer = Object.values(this.players).find(p => p.name === playerName && p.id !== playerId);
    if (existingPlayer) {
      throw new Error('Player name already exists');
    }

    this.players[playerId] = {
      id: playerId,
      name: playerName,
      chips: 1000, // Starting chips
      currentBet: 0,
      totalBet: 0,
      isActive: true,
      hasFolded: false,
      hasActed: false,
      isAllIn: false
    };

    // Set first player as admin
    if (isAdmin || !this.admin) {
      this.admin = playerId;
    }

    this.updateActivity();
    return this.players[playerId];
  }

  rejoinPlayer(playerId) {
    const player = this.players[playerId];
    if (player) {
      this.updateActivity();
      return player;
    }
    return null;
  }

  removePlayer(playerId) {
    delete this.players[playerId];
    
    // If admin left, transfer admin to next player
    if (this.admin === playerId) {
      const remainingPlayers = Object.keys(this.players);
      this.admin = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
    }
    
    if (Object.keys(this.players).length === 0) {
      this.gameEnded = true;
    }
  }

  canDeletePlayer(adminId, targetPlayerId) {
    return this.admin === adminId && this.players[targetPlayerId] && targetPlayerId !== adminId;
  }

  deletePlayer(adminId, targetPlayerId) {
    if (!this.canDeletePlayer(adminId, targetPlayerId)) {
      throw new Error('Only admin can remove other players');
    }
    
    // If removing current player, move to next player
    if (this.currentPlayer === targetPlayerId && this.gameStarted) {
      this.nextPlayer();
    }
    
    this.removePlayer(targetPlayerId);
    
    // Check if game should end (less than 2 players)
    const activePlayers = Object.values(this.players).filter(p => !p.hasFolded);
    if (activePlayers.length < 2 && this.gameStarted) {
      if (activePlayers.length === 1) {
        this.endHand(activePlayers[0].id);
      } else {
        this.gameEnded = true;
      }
    }
    
    this.updateActivity();
    return true;
  }

  canEditPot(playerId) {
    return this.admin === playerId;
  }

  editPot(adminId, newPotValue) {
    if (!this.canEditPot(adminId)) {
      throw new Error('Only admin can edit pot value');
    }
    
    if (newPotValue < 0) {
      throw new Error('Pot value cannot be negative');
    }
    
    this.pot = newPotValue;
    this.updateActivity();
    return this.pot;
  }

  updateActivity() {
    this.lastActivity = new Date();
  }

  isExpired() {
    const now = new Date();
    return (now - this.lastActivity) > this.sessionTimeout;
  }

  startGame(startingPlayerId = null) {
    if (Object.keys(this.players).length < 2) {
      throw new Error('Need at least 2 players to start');
    }
    
    this.gameStarted = true;
    const playerIds = Object.keys(this.players);
    
    // Set starting player
    if (startingPlayerId && this.players[startingPlayerId]) {
      this.dealerIndex = playerIds.indexOf(startingPlayerId);
      this.currentPlayer = startingPlayerId;
    } else {
      this.dealerIndex = 0;
      this.currentPlayer = playerIds[0];
    }
    
    this.startNewHand();
  }

  canSetStartingPlayer(adminId) {
    return this.admin === adminId && !this.gameStarted;
  }

  setStartingPlayer(adminId, startingPlayerId) {
    if (!this.canSetStartingPlayer(adminId)) {
      throw new Error('Only admin can set starting player before game starts');
    }
    
    const playerIds = Object.keys(this.players);
    if (!this.players[startingPlayerId]) {
      throw new Error('Selected player does not exist');
    }
    
    this.dealerIndex = playerIds.indexOf(startingPlayerId);
    this.updateActivity();
    return startingPlayerId;
  }

  startNewHand() {
    // Reset player states
    Object.values(this.players).forEach(player => {
      player.currentBet = 0;
      player.totalBet = 0;
      player.hasFolded = false;
      player.hasActed = false;
      player.isAllIn = false;
      player.isActive = true;
    });

    this.pot = 0;
    this.currentBet = 0;
    this.bettingRound = 0;
    this.bettingHistory = [];
    this.winner = null;

    // Post blinds
    this.postBlinds();
    
    // Set first player to act (after big blind)
    const playerIds = Object.keys(this.players);
    const bigBlindIndex = (this.dealerIndex + 2) % playerIds.length;
    this.currentPlayerIndex = (bigBlindIndex + 1) % playerIds.length;
    this.currentPlayer = playerIds[this.currentPlayerIndex];
    
    // Reset session timeout on new game
    this.updateActivity();
  }

  postBlinds() {
    const playerIds = Object.keys(this.players);
    if (playerIds.length < 2) return;

    // Small blind
    const smallBlindIndex = (this.dealerIndex + 1) % playerIds.length;
    const smallBlindPlayer = this.players[playerIds[smallBlindIndex]];
    const smallBlindAmount = Math.min(this.smallBlind, smallBlindPlayer.chips);
    smallBlindPlayer.chips -= smallBlindAmount;
    smallBlindPlayer.currentBet = smallBlindAmount;
    smallBlindPlayer.totalBet = smallBlindAmount;
    this.pot += smallBlindAmount;

    // Big blind
    const bigBlindIndex = (this.dealerIndex + 2) % playerIds.length;
    const bigBlindPlayer = this.players[playerIds[bigBlindIndex]];
    const bigBlindAmount = Math.min(this.bigBlind, bigBlindPlayer.chips);
    bigBlindPlayer.chips -= bigBlindAmount;
    bigBlindPlayer.currentBet = bigBlindAmount;
    bigBlindPlayer.totalBet = bigBlindAmount;
    this.pot += bigBlindAmount;
    this.currentBet = bigBlindAmount;

    this.bettingHistory.push({
      action: 'blinds',
      smallBlind: { playerId: playerIds[smallBlindIndex], amount: smallBlindAmount },
      bigBlind: { playerId: playerIds[bigBlindIndex], amount: bigBlindAmount }
    });
  }

  canPlayerAct(playerId) {
    const player = this.players[playerId];
    if (!player || player.hasFolded || player.isAllIn) return false;
    
    return this.currentPlayer === playerId;
  }

  getValidActions(playerId) {
    const player = this.players[playerId];
    if (!this.canPlayerAct(playerId)) return [];

    const actions = [];
    const callAmount = this.currentBet - player.currentBet;

    // Always can fold (unless already all-in)
    if (!player.isAllIn) {
      actions.push('fold');
    }

    // Can check if no bet to call
    if (callAmount === 0 && !player.isAllIn) {
      actions.push('check');
    }

    // Can call if there's a bet and player has chips
    if (callAmount > 0 && player.chips > 0) {
      if (player.chips >= callAmount) {
        actions.push('call');
      } else {
        actions.push('allin'); // Can only call all-in
      }
    }

    // Can bet/raise if player has chips
    if (player.chips > 0 && !player.isAllIn) {
      if (this.currentBet === 0) {
        actions.push('bet');
      } else if (player.chips > callAmount) {
        actions.push('raise');
      }
    }

    return actions;
  }

  performAction(playerId, action, amount = 0) {
    if (!this.canPlayerAct(playerId)) {
      throw new Error('Player cannot act right now');
    }

    const player = this.players[playerId];
    const validActions = this.getValidActions(playerId);
    
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}`);
    }

    let betAmount = 0;
    const callAmount = this.currentBet - player.currentBet;

    switch (action) {
      case 'fold':
        player.hasFolded = true;
        player.isActive = false;
        break;

      case 'check':
        // No money changes hands
        break;

      case 'call':
        betAmount = Math.min(callAmount, player.chips);
        player.chips -= betAmount;
        player.currentBet += betAmount;
        player.totalBet += betAmount;
        this.pot += betAmount;
        
        if (player.chips === 0) {
          player.isAllIn = true;
        }
        break;

      case 'bet':
      case 'raise':
        if (amount <= 0) {
          throw new Error('Bet amount must be positive');
        }
        
        const totalBetAmount = callAmount + amount;
        if (totalBetAmount > player.chips) {
          throw new Error('Not enough chips');
        }

        betAmount = Math.min(totalBetAmount, player.chips);
        player.chips -= betAmount;
        player.currentBet += betAmount;
        player.totalBet += betAmount;
        this.pot += betAmount;
        this.currentBet = player.currentBet;
        
        if (player.chips === 0) {
          player.isAllIn = true;
        }
        
        // Reset other players' hasActed status for raises
        if (action === 'raise') {
          Object.values(this.players).forEach(p => {
            if (p.id !== playerId && !p.hasFolded) {
              p.hasActed = false;
            }
          });
        }
        break;

      case 'allin':
        betAmount = player.chips;
        player.currentBet += betAmount;
        player.totalBet += betAmount;
        this.pot += betAmount;
        player.chips = 0;
        player.isAllIn = true;
        
        if (player.currentBet > this.currentBet) {
          this.currentBet = player.currentBet;
          // Reset other players' hasActed status
          Object.values(this.players).forEach(p => {
            if (p.id !== playerId && !p.hasFolded) {
              p.hasActed = false;
            }
          });
        }
        break;
    }

    player.hasActed = true;

    this.bettingHistory.push({
      playerId: playerId,
      playerName: player.name,
      action: action,
      amount: betAmount,
      totalBet: player.currentBet,
      timestamp: new Date()
    });

    // Move to next player
    this.nextPlayer();

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.completeBettingRound();
    }

    return {
      action,
      amount: betAmount,
      playerChips: player.chips,
      pot: this.pot
    };
  }

  nextPlayer() {
    const playerIds = Object.keys(this.players);
    let attempts = 0;
    
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % playerIds.length;
      this.currentPlayer = playerIds[this.currentPlayerIndex];
      attempts++;
    } while (
      attempts < playerIds.length && 
      (this.players[this.currentPlayer].hasFolded || 
       this.players[this.currentPlayer].isAllIn)
    );
  }

  isBettingRoundComplete() {
    const activePlayers = Object.values(this.players).filter(p => 
      p.isActive && !p.hasFolded && !p.isAllIn
    );
    
    // If only one active player left, round is complete
    if (activePlayers.length <= 1) return true;
    
    // Check if all active players have acted and matched the current bet
    return activePlayers.every(player => 
      player.hasActed && player.currentBet === this.currentBet
    );
  }

  completeBettingRound() {
    // Reset for next betting round
    Object.values(this.players).forEach(player => {
      player.hasActed = false;
      player.currentBet = 0; // Reset current bet for next round
    });
    
    this.currentBet = 0;
    this.bettingRound++;
    
    // Set next player to dealer + 1 (or first active player)
    const playerIds = Object.keys(this.players);
    this.currentPlayerIndex = this.dealerIndex;
    this.nextPlayer();
    
    // Check if hand is over (all betting rounds complete or only one player left)
    const activePlayers = Object.values(this.players).filter(p => 
      !p.hasFolded
    );
    
    if (activePlayers.length === 1) {
      // Only one player left, they win
      this.endHand(activePlayers[0].id);
    } else if (this.bettingRound >= 4) {
      // All betting rounds complete, need showdown
      this.endHand(); // For now, just award to first active player
    }
  }

  endHand(winnerId = null) {
    if (winnerId) {
      this.players[winnerId].chips += this.pot;
      this.winner = winnerId;
    } else {
      // In a real game, this would be a showdown
      // For now, just award to first non-folded player
      const activePlayers = Object.values(this.players).filter(p => !p.hasFolded);
      if (activePlayers.length > 0) {
        activePlayers[0].chips += this.pot;
        this.winner = activePlayers[0].id;
      }
    }
    
    this.pot = 0;
    this.dealerIndex = (this.dealerIndex + 1) % Object.keys(this.players).length;
  }

  getGameState() {
    return {
      roomCode: this.roomCode,
      players: this.players,
      admin: this.admin,
      currentPlayer: this.currentPlayer,
      gameStarted: this.gameStarted,
      gameEnded: this.gameEnded,
      winner: this.winner,
      pot: this.pot,
      currentBet: this.currentBet,
      bettingRound: this.bettingRound,
      bettingHistory: this.bettingHistory.slice(-10), // Last 10 actions
      dealerIndex: this.dealerIndex
    };
  }

  reset() {
    Object.values(this.players).forEach(player => {
      player.chips = 1000;
      player.currentBet = 0;
      player.totalBet = 0;
      player.isActive = true;
      player.hasFolded = false;
      player.hasActed = false;
      player.isAllIn = false;
    });
    
    this.pot = 0;
    this.currentBet = 0;
    this.bettingRound = 0;
    this.bettingHistory = [];
    this.currentPlayerIndex = 0;
    this.currentPlayer = Object.keys(this.players)[0];
    this.gameEnded = false;
    this.winner = null;
    this.dealerIndex = 0;
  }
}

// Game rooms storage with persistence
const fs = require('fs');
const gameRooms = new Map();
const GAMES_FILE = path.join(__dirname, 'games.json');

function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Load existing games on startup
function loadGames() {
  try {
    if (fs.existsSync(GAMES_FILE)) {
      const data = fs.readFileSync(GAMES_FILE, 'utf8');
      const savedGames = JSON.parse(data);
      
      Object.entries(savedGames).forEach(([roomCode, gameData]) => {
        const game = new PokerGame(roomCode);
        Object.assign(game, gameData);
        // Convert date strings back to Date objects
        game.createdAt = new Date(game.createdAt);
        game.lastActivity = new Date(game.lastActivity);
        
        // Only load non-expired games
        if (!game.isExpired()) {
          gameRooms.set(roomCode, game);
          console.log(`Restored room: ${roomCode}`);
        }
      });
    }
  } catch (error) {
    console.error('Error loading games:', error);
  }
}

// Save games to file
function saveGames() {
  try {
    const gamesToSave = {};
    gameRooms.forEach((game, roomCode) => {
      gamesToSave[roomCode] = game;
    });
    fs.writeFileSync(GAMES_FILE, JSON.stringify(gamesToSave, null, 2));
  } catch (error) {
    console.error('Error saving games:', error);
  }
}

// Load games on startup
loadGames();

// Save games every 2 minutes and clean up expired rooms
setInterval(() => {
  const now = new Date();
  gameRooms.forEach((game, roomCode) => {
    if (game.isExpired()) {
      console.log(`Cleaning up expired room: ${roomCode}`);
      gameRooms.delete(roomCode);
    }
  });
  
  // Save current games
  saveGames();
}, 2 * 60 * 1000); // 2 minutes

// Save games on process exit
process.on('SIGTERM', saveGames);
process.on('SIGINT', saveGames);

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (data) => {
    const roomCode = generateRoomCode();
    const game = new PokerGame(roomCode);
    
    try {
      const player = game.addPlayer(data.playerId, data.playerName, true); // Creator is admin
      gameRooms.set(roomCode, game);
      
      socket.join(roomCode);
      socket.emit('roomJoined', {
        roomCode: roomCode,
        gameState: game.getGameState()
      });

      socket.broadcast.to(roomCode).emit('playerJoined', {
        playerId: data.playerId,
        playerName: data.playerName
      });

      console.log(`Room ${roomCode} created by ${data.playerName} (admin)`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('joinRoom', (data) => {
    const game = gameRooms.get(data.roomCode);
    if (!game) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    try {
      // Try to rejoin first (for refresh scenarios)
      let player = game.rejoinPlayer(data.playerId);
      let isRejoining = !!player;
      
      if (!player) {
        // Add as new player
        player = game.addPlayer(data.playerId, data.playerName);
      }
      
      socket.join(data.roomCode);
      
      socket.emit('roomJoined', {
        roomCode: data.roomCode,
        gameState: game.getGameState(),
        isRejoining: isRejoining
      });

      if (!isRejoining) {
        socket.broadcast.to(data.roomCode).emit('playerJoined', {
          playerId: data.playerId,
          playerName: data.playerName
        });
        console.log(`${data.playerName} joined room ${data.roomCode}`);
      } else {
        console.log(`${data.playerName} rejoined room ${data.roomCode}`);
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('startGame', (data) => {
    const game = gameRooms.get(data.roomCode);
    if (!game || game.gameStarted) return;

    try {
      game.startGame(data.startingPlayerId);
      io.to(data.roomCode).emit('gameStarted', {
        gameState: game.getGameState(),
        startingPlayer: data.startingPlayerId
      });
      console.log(`Game started in room ${data.roomCode} with starting player: ${data.startingPlayerId || 'default'}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('setStartingPlayer', (data) => {
    const game = gameRooms.get(data.roomCode);
    if (!game) return;

    try {
      const startingPlayerId = game.setStartingPlayer(data.adminId, data.startingPlayerId);
      const startingPlayer = game.players[startingPlayerId];
      
      io.to(data.roomCode).emit('startingPlayerSet', {
        startingPlayerId: startingPlayerId,
        startingPlayerName: startingPlayer.name,
        gameState: game.getGameState()
      });

      console.log(`Starting player set to ${startingPlayer.name} in room ${data.roomCode}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('performAction', (data) => {
    const game = gameRooms.get(data.roomCode);
    if (!game || game.gameEnded) return;

    try {
      const result = game.performAction(data.playerId, data.action, data.amount);
      const player = game.players[data.playerId];
      
      io.to(data.roomCode).emit('actionPerformed', {
        playerId: data.playerId,
        playerName: player.name,
        action: data.action,
        amount: data.amount,
        result: result,
        gameState: game.getGameState()
      });

      if (game.winner) {
        const winner = game.players[game.winner];
        io.to(data.roomCode).emit('handWon', {
          winner: winner.name,
          winnerId: game.winner,
          pot: result.pot
        });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('getValidActions', (data) => {
    const game = gameRooms.get(data.roomCode);
    if (!game) return;

    const validActions = game.getValidActions(data.playerId);
    socket.emit('validActions', {
      playerId: data.playerId,
      actions: validActions
    });
  });

  socket.on('deletePlayer', (data) => {
    const game = gameRooms.get(data.roomCode);
    if (!game) return;

    try {
      const success = game.deletePlayer(data.adminId, data.targetPlayerId);
      if (success) {
        const deletedPlayerName = data.targetPlayerName || 'Player';
        
        io.to(data.roomCode).emit('playerDeleted', {
          deletedPlayerId: data.targetPlayerId,
          deletedPlayerName: deletedPlayerName,
          gameState: game.getGameState()
        });

        console.log(`Player ${deletedPlayerName} deleted from room ${data.roomCode}`);
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('editPot', (data) => {
    const game = gameRooms.get(data.roomCode);
    if (!game) return;

    try {
      const newPot = game.editPot(data.adminId, data.newPotValue);
      
      io.to(data.roomCode).emit('potEdited', {
        newPot: newPot,
        gameState: game.getGameState()
      });

      console.log(`Pot edited to $${newPot} in room ${data.roomCode}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('chatMessage', (data) => {
    socket.broadcast.to(data.roomCode).emit('chatMessage', {
      playerName: data.playerName,
      message: data.message,
      timestamp: new Date()
    });
  });

  socket.on('newHand', (data) => {
    const game = gameRooms.get(data.roomCode);
    if (!game) return;

    game.startNewHand();
    io.to(data.roomCode).emit('newHandStarted', {
      gameState: game.getGameState()
    });
  });

  socket.on('resetGame', (data) => {
    const game = gameRooms.get(data.roomCode);
    if (!game) return;

    game.reset();
    io.to(data.roomCode).emit('gameReset', {
      gameState: game.getGameState()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Handle player leaving rooms
    gameRooms.forEach((game, roomCode) => {
      Object.keys(game.players).forEach(playerId => {
        // This is simplified - in production you'd track socket IDs to player IDs
      });
    });
  });
});

// Vitally API Routes
app.get('/api/vitally/status', (req, res) => {
  res.json({
    enabled: !!vitallyService,
    message: vitallyService ? 'Vitally service is active' : 'Vitally service not configured'
  });
});

app.get('/api/vitally/accounts', async (req, res) => {
  if (!vitallyService) {
    return res.status(503).json({ error: 'Vitally service not available' });
  }

  try {
    const { limit = 50 } = req.query;
    const accounts = await vitallyService.getAccounts(limit);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts', message: error.message });
  }
});

app.get('/api/vitally/accounts/:accountId/activity', async (req, res) => {
  if (!vitallyService) {
    return res.status(503).json({ error: 'Vitally service not available' });
  }

  try {
    const { accountId } = req.params;
    const { days = 30 } = req.query;
    
    const activity = await vitallyService.getAccountActivity(accountId, parseInt(days));
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch account activity', message: error.message });
  }
});

app.get('/api/vitally/accounts/:accountId/summary', async (req, res) => {
  if (!vitallyService) {
    return res.status(503).json({ error: 'Vitally service not available' });
  }

  try {
    const { accountId } = req.params;
    const { days = 30 } = req.query;
    
    const activity = await vitallyService.getAccountActivity(accountId, parseInt(days));
    const summary = dataProcessor.processAccountActivity(activity);
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate account summary', message: error.message });
  }
});

app.get('/api/vitally/accounts/:accountId/health', async (req, res) => {
  if (!vitallyService) {
    return res.status(503).json({ error: 'Vitally service not available' });
  }

  try {
    const { accountId } = req.params;
    const { days = 30 } = req.query;
    
    const activity = await vitallyService.getAccountActivity(accountId, parseInt(days));
    const summary = dataProcessor.processAccountActivity(activity);
    const healthScore = healthScorer.scoreAccount(summary);
    
    res.json(healthScore);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate health score', message: error.message });
  }
});

app.get('/api/vitally/health-dashboard', async (req, res) => {
  if (!vitallyService) {
    return res.status(503).json({ error: 'Vitally service not available' });
  }

  try {
    const { days = 30, limit = 25 } = req.query;
    
    const activities = await vitallyService.getAllAccountsActivity(parseInt(days), parseInt(limit));
    
    const results = activities.map(activity => {
      if (activity.status === 'fulfilled' && activity.data) {
        const summary = dataProcessor.processAccountActivity(activity.data);
        const healthScore = healthScorer.scoreAccount(summary);
        return {
          ...healthScore,
          error: null
        };
      } else {
        return {
          accountId: activity.accountId,
          accountName: activity.accountName,
          healthScore: null,
          healthRating: 'unknown',
          error: activity.error
        };
      }
    });

    // Sort by health score (poor first, then concerning, then healthy)
    const sortedResults = results.sort((a, b) => {
      const ratingOrder = { 'poor': 0, 'concerning': 1, 'healthy': 2, 'unknown': 3 };
      return ratingOrder[a.healthRating] - ratingOrder[b.healthRating];
    });

    res.json({
      totalAccounts: results.length,
      period: { days: parseInt(days) },
      healthSummary: {
        healthy: results.filter(r => r.healthRating === 'healthy').length,
        concerning: results.filter(r => r.healthRating === 'concerning').length,
        poor: results.filter(r => r.healthRating === 'poor').length,
        unknown: results.filter(r => r.healthRating === 'unknown').length
      },
      accounts: sortedResults,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate health dashboard', message: error.message });
  }
});

app.get('/api/vitally/rubric', (req, res) => {
  res.json(healthScorer.getRubric());
});

app.put('/api/vitally/rubric', (req, res) => {
  try {
    healthScorer.updateRubric(req.body);
    res.json({ message: 'Rubric updated successfully', rubric: healthScorer.getRubric() });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update rubric', message: error.message });
  }
});

// Simple welcome API route
app.get('/api/welcome', (req, res) => {
  res.json({ 
    message: 'Welcome to Customer News Tracker API',
    version: '1.0.0',
    companies: COMPANIES,
    features: ['Google News search', 'Company filtering', 'Real-time updates', 'Executive profiles']
  });
});

// Company profiles API endpoint
app.get('/api/companies', (req, res) => {
  res.json({
    companies: COMPANY_PROFILES,
    lastUpdated: new Date().toISOString()
  });
});

// Individual company profile API endpoint
app.get('/api/companies/:company', (req, res) => {
  const { company } = req.params;
  
  if (!COMPANY_PROFILES[company]) {
    return res.status(404).json({ 
      error: 'Company not found. Available companies: ' + COMPANIES.join(', ') 
    });
  }

  res.json({
    company: COMPANY_PROFILES[company],
    lastUpdated: new Date().toISOString()
  });
});

// News search API endpoint
app.get('/api/news', async (req, res) => {
  try {
    const { company, limit = 10 } = req.query;
    
    if (!company || !COMPANIES.includes(company)) {
      return res.status(400).json({ 
        error: 'Invalid company. Must be one of: ' + COMPANIES.join(', ') 
      });
    }

    const searchQuery = encodeURIComponent(company);
    const googleNewsUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=en-US&gl=US&ceid=US:en`;
    
    const feed = await parser.parseURL(googleNewsUrl);
    
    const articles = feed.items.slice(0, parseInt(limit)).map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      source: item.source?.value || 'Unknown',
      snippet: item.contentSnippet || item.content?.substring(0, 200) + '...'
    }));

    res.json({
      company,
      totalArticles: articles.length,
      articles,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news', 
      message: error.message 
    });
  }
});

// Get news for all companies
app.get('/api/news/all', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const results = {};

    for (const company of COMPANIES) {
      try {
        const searchQuery = encodeURIComponent(company);
        const googleNewsUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=en-US&gl=US&ceid=US:en`;
        
        const feed = await parser.parseURL(googleNewsUrl);
        
        results[company] = feed.items.slice(0, parseInt(limit)).map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          source: item.source?.value || 'Unknown',
          snippet: item.contentSnippet || item.content?.substring(0, 200) + '...'
        }));
      } catch (error) {
        console.error(`Error fetching news for ${company}:`, error);
        results[company] = [];
      }
    }

    res.json({
      companies: COMPANIES,
      results,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching all news:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news', 
      message: error.message 
    });
  }
});

// Serve static files from client directory
app.use(express.static('client'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Main route - serve the unified dashboard
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client', 'unified-dashboard.html'));
});

// CSM Health Dashboard route
app.get('/health', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client', 'csm-health-dashboard.html'));
});

// Alternative routes
app.get('/apple', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client', 'apple-news-tracker.html'));
});

app.get('/old', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client', 'news-tracker.html'));
});

// PDF Proxy route to avoid CORS issues
app.get('/api/pdf-proxy', async (req, res) => {
  try {
    const pdfUrl = 'https://drodrik.scholar.harvard.edu/sites/scholar.harvard.edu/files/dani-rodrik/files/is_populism_necessarily_bad_economics.pdf';
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': response.data.length,
      'Access-Control-Allow-Origin': '*',
      'Content-Disposition': 'attachment; filename="is-populism-necessarily-bad-economics.pdf"'
    });
    
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).json({ message: 'Error fetching PDF', error: error.message });
  }
});

// External PDF Proxy route to handle any external PDF URL
app.get('/api/external-pdf-proxy', async (req, res) => {
  try {
    const externalUrl = req.query.url;
    
    if (!externalUrl) {
      return res.status(400).json({ message: 'URL parameter is required' });
    }
    
    // Validate URL
    try {
      new URL(externalUrl);
    } catch {
      return res.status(400).json({ message: 'Invalid URL provided' });
    }
    
    console.log('Proxying external PDF:', externalUrl);
    
    const response = await axios.get(externalUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000 // 30 second timeout
    });
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': response.data.length,
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching external PDF:', error);
    res.status(500).json({ 
      message: 'Error fetching external PDF', 
      error: error.message,
      url: req.query.url 
    });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client'));
}

// Sudoku game route
app.get('/sudoku', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client', 'sudoku-game.html'));
});

// Poker game route
app.get('/poker', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client', 'poker-game.html'));
});

// Ludo game route
app.get('/ludo', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'client', 'ludo-game.html'));
});

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));