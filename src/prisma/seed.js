import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { GENRES } from "../constants/movie.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

//how many generated movies to insert, e.g. `npm run seed -- 5000`
const MOVIE_COUNT = Number(process.argv[2]) || 20000;
//rows per INSERT. one big insert of 20k rows is slow and can hit
//postgres' parameter limit, one insert per row is 20k round trips.
const BATCH_SIZE = 1000;

const SEED_USER = {
  name: "Seed User",
  email: "seed@moviewatchlist.dev",
  password: "Password123!",
};

//seeded random number generator (mulberry32), so every run creates the same data.
let state = 42;
const random = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randomInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;
const pick = (list) => list[Math.floor(random() * list.length)];
const pickMany = (list, count) => {
  const copy = [...list];
  const picked = [];
  while (picked.length < count) {
    picked.push(copy.splice(Math.floor(random() * copy.length), 1)[0]);
  }
  return picked;
};

const ADJECTIVES = [
  "Silent", "Broken", "Hidden", "Last", "Crimson", "Frozen", "Golden", "Lost",
  "Midnight", "Electric", "Burning", "Forgotten", "Wild", "Dark", "Iron",
  "Hollow", "Endless", "Savage", "Secret", "Distant", "Final", "Shattered",
];
const NOUNS = [
  "Horizon", "River", "Kingdom", "Protocol", "Empire", "Shadow", "Signal",
  "Garden", "City", "Storm", "Promise", "Frontier", "Mirror", "Echo", "Code",
  "Harbor", "Legacy", "Orbit", "Witness", "Journey", "Paradise", "Summit",
];
const PLACES = [
  "Tokyo", "Lagos", "Berlin", "Mumbai", "the North", "Mars", "Brooklyn",
  "the Desert", "Paris", "the Deep", "Karachi", "Rio", "Dhaka", "Cairo",
];
const TITLE_PATTERNS = [
  () => `The ${pick(ADJECTIVES)} ${pick(NOUNS)}`,
  () => `${pick(NOUNS)} of ${pick(PLACES)}`,
  () => `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
  () => `The ${pick(NOUNS)} ${pick(["Returns", "Rising", "Awakens", "Begins"])}`,
  () => `${pick(ADJECTIVES)} ${pick(NOUNS)} ${randomInt(2, 4)}`,
];
const HEROES = [
  "a retired detective", "a young pilot", "two estranged sisters", "a rookie chef",
  "a disgraced scientist", "a small-town teacher", "an undercover agent",
  "a struggling musician", "a stubborn farmer", "a teenage hacker",
];
const PLOTS = [
  "uncovers a conspiracy that reaches the highest levels of power",
  "must survive one impossible night",
  "returns home to settle an old debt",
  "races against time to stop a disaster",
  "discovers a secret that changes everything",
  "forms an unlikely friendship that tests every loyalty",
  "is pulled into a dangerous game with no rules",
];

const CLASSICS = [
  { title: "The Matrix", overview: "A computer hacker learns about the true nature of reality.", releaseYear: 1999, genres: ["Action", "Sci-Fi"], runtime: 136 },
  { title: "Inception", overview: "A thief who steals corporate secrets through dream-sharing technology.", releaseYear: 2010, genres: ["Action", "Sci-Fi", "Thriller"], runtime: 148 },
  { title: "The Dark Knight", overview: "Batman faces the Joker in a battle for Gotham's soul.", releaseYear: 2008, genres: ["Action", "Crime", "Drama"], runtime: 152 },
  { title: "Pulp Fiction", overview: "The lives of two mob hitmen, a boxer, and others intertwine.", releaseYear: 1994, genres: ["Crime", "Drama"], runtime: 154 },
  { title: "Interstellar", overview: "A team of explorers travel through a wormhole in space.", releaseYear: 2014, genres: ["Adventure", "Drama", "Sci-Fi"], runtime: 169 },
  { title: "The Shawshank Redemption", overview: "Two imprisoned men bond over a number of years.", releaseYear: 1994, genres: ["Drama"], runtime: 142 },
  { title: "Fight Club", overview: "An insomniac office worker and a soapmaker form an underground fight club.", releaseYear: 1999, genres: ["Drama"], runtime: 139 },
  { title: "Forrest Gump", overview: "Decades of history unfold through the eyes of an Alabama man.", releaseYear: 1994, genres: ["Drama", "Romance"], runtime: 142 },
  { title: "The Godfather", overview: "The aging patriarch of a crime dynasty transfers control to his son.", releaseYear: 1972, genres: ["Crime", "Drama"], runtime: 175 },
  { title: "Goodfellas", overview: "The story of Henry Hill and his life in the mob.", releaseYear: 1990, genres: ["Biography", "Crime", "Drama"], runtime: 146 },
];

const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;

const generateMovie = (index, userId) => {
  //newer years are more likely, like real movie catalogues.
  const releaseYear = 2025 - Math.floor(Math.pow(random(), 2) * 76);
  return {
    title: pick(TITLE_PATTERNS)(),
    overview: `In ${pick(PLACES)}, ${pick(HEROES)} ${pick(PLOTS)}.`,
    releaseYear,
    genres: pickMany(GENRES, randomInt(1, 3)),
    runtime: randomInt(75, 190),
    posterUrl: `https://example.com/posters/${index + 1}.jpg`,
    createdBy: userId,
    //spread createdAt over the last 3 years so sorting by it means something.
    createdAt: new Date(Date.now() - Math.floor(random() * THREE_YEARS_MS)),
  };
};

const main = async () => {
  console.time("seed");

  //upsert = create the seed user once, reuse it on every later run.
  const hashedPassword = await bcrypt.hash(SEED_USER.password, 10);
  const user = await prisma.user.upsert({
    where: { email: SEED_USER.email },
    update: {},
    create: { ...SEED_USER, password: hashedPassword },
  });

  //delete only the seed user's movies so running the seed twice doesn't duplicate data.
  const { count: deleted } = await prisma.movie.deleteMany({
    where: { createdBy: user.id },
  });
  console.log(`Removed ${deleted} previously seeded movies.`);

  const movies = [
    ...CLASSICS.map((movie) => ({ ...movie, createdBy: user.id })),
    ...Array.from({ length: MOVIE_COUNT }, (_, i) => generateMovie(i, user.id)),
  ];

  for (let i = 0; i < movies.length; i += BATCH_SIZE) {
    const batch = movies.slice(i, i + BATCH_SIZE);
    await prisma.movie.createMany({ data: batch });
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, movies.length)} / ${movies.length}`);
  }

  console.log(`Seeding completed! Log in with ${SEED_USER.email} / ${SEED_USER.password}`);
  console.timeEnd("seed");
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
