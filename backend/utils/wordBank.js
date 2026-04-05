// Categorized Word Bank (150+ words)
const WORD_BANK = {
  easy: [
    "Apple", "Ball", "Cat", "Dog", "Fish", "Hat", "Ice", "Jar", "Kite", "Lamp",
    "Moon", "Nest", "Owl", "Pan", "Queen", "Ring", "Sun", "Tree", "Umbrella", "Van",
    "Wave", "Fox", "Yak", "Zoo", "Ant", "Bee", "Cup", "Door", "Egg", "Fan",
    "Glue", "Horn", "Ink", "Jug", "Key", "Leaf", "Map", "Net", "Oar", "Pen",
    "Rat", "Saw", "Top", "Urn", "Vase", "Web", "Box", "Yarn", "Zip", "Arm"
  ],
  medium: [
    "Guitar", "Helmet", "Igloo", "Jungle", "Kangaroo", "Lighthouse", "Mountain",
    "Notebook", "Ocean", "Piano", "Rocket", "Sunflower", "Telescope", "Waterfall",
    "Elephant", "Flamingo", "Astronaut", "Balloon", "Cactus", "Dragon", "Eagle",
    "Galaxy", "Hammer", "Jellyfish", "Koala", "Lemon", "Ninja", "Penguin", "Robot",
    "Skateboard", "Tiger", "Unicorn", "Vampire", "Wizard", "Zombie", "Tornado",
    "Volcano", "Xylophone", "Yacht", "Zebra", "Candle", "Forest", "Lantern",
    "Magnet", "Noodle", "Compass", "Puzzle", "Snowflake", "Trophy"
  ],
  hard: [
    "Archipelago", "Bioluminescence", "Calligraphy", "Dendrology", "Epiphany",
    "Fjord", "Gauntlet", "Hieroglyph", "Iridescence", "Juxtapose", "Kaleidoscope",
    "Labyrinth", "Metamorphosis", "Nebula", "Oscilloscope", "Palindrome",
    "Quicksand", "Renaissance", "Silhouette", "Transcendence", "Ubiquitous",
    "Vortex", "Whirlpool", "Xenolith", "Yachting", "Amalgamation", "Bureaucracy",
    "Catastrophe", "Dichotomy", "Equilibrium", "Fahrenheit", "Grotesque",
    "Halcyon", "Iconoclast", "Juggernaut", "Maelstrom", "Nostalgia", "Oblivion",
    "Phantasm", "Quagmire", "Resurgence", "Soliloquy", "Thunderstruck", "Utopia"
  ]
};

// Fisher-Yates Shuffle
const fisherYatesShuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Create a shuffled deck filtered by difficulty (EASY | MEDIUM | HARD | MIXED)
exports.createWordDeck = (difficulty = 'MIXED') => {
  const d = (difficulty || 'MIXED').toUpperCase();
  let allWords;
  if (d === 'EASY') {
    allWords = WORD_BANK.easy.map(w => ({ word: w, difficulty: 'EASY' }));
  } else if (d === 'MEDIUM') {
    allWords = WORD_BANK.medium.map(w => ({ word: w, difficulty: 'MEDIUM' }));
  } else if (d === 'HARD') {
    allWords = WORD_BANK.hard.map(w => ({ word: w, difficulty: 'HARD' }));
  } else {
    allWords = [
      ...WORD_BANK.easy.map(w => ({ word: w, difficulty: 'EASY' })),
      ...WORD_BANK.medium.map(w => ({ word: w, difficulty: 'MEDIUM' })),
      ...WORD_BANK.hard.map(w => ({ word: w, difficulty: 'HARD' })),
    ];
  }
  return fisherYatesShuffle(allWords);
};

// Pop 3 words from the deck (non-repeating)
exports.popWords = (deck, count = 3) => {
  const options = [];
  while (options.length < count && deck.length > 0) {
    options.push(deck.shift());
  }
  return options;
};
