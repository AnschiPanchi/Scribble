const words = [
  "Apple", "Banana", "Computer", "Dinosaur", "Elephant", "Fireplace", "Guitar", "Helicopter",
  "Ice Cream", "Jungle", "Kangaroo", "Lighthouse", "Mountain", "Notebook", "Ocean", "Piano",
  "Queen", "Rocket", "Sunflower", "Telescope", "Umbrella", "Volcano", "Waterfall", "Xylophone",
  "Yacht", "Zebra", "Astronaut", "Balloon", "Cactus", "Dragon", "Eagle", "Flamingo", "Galaxy",
  "Hammer", "Igloo", "Jellyfish", "Koala", "Lemon", "Moon", "Ninja", "Owl", "Penguin", "Robot",
  "Skateboard", "Tiger", "Unicorn", "Vampire", "Wizard", "Yo-yo", "Zombie"
];

exports.getWords = (count) => {
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
