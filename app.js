const CHARACTERS_API = "https://api.api-onepiece.com/v2/characters/en";
const PORTRAIT_BASE = "https://hlryizauzapedkefdviw.supabase.co/storage/v1/object/public/characters/";
const CORE_CREW = [
  "Monkey D Luffy",
  "Roronoa Zoro",
  "Nami",
  "Usopp",
  "Sanji",
  "Tony-Tony Chopper",
  "Nico Robin",
  "Franky",
  "Brook",
  "Jinbe",
];

const crewList = document.querySelector("#crew-list");
const characterSearch = document.querySelector("#character-search");
const searchResults = document.querySelector("#search-results");
const bountySort = document.querySelector("#bounty-sort");
const bountyList = document.querySelector("#bounty-list");
let characters = [];

function normalizeName(name) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

function portraitUrl(name) {
  const slug = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${PORTRAIT_BASE}${encodeURIComponent(slug)}.webp`;
}

function formatBounty(value) {
  const amount = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(amount) && amount > 0
    ? `${amount.toLocaleString("en-US")} berries`
    : "No known bounty";
}

function setMessage(container, message, isError = false) {
  container.replaceChildren();
  const messageElement = document.createElement(container === bountyList ? "li" : "p");
  messageElement.className = "status-message";
  messageElement.textContent = message;
  if (isError) messageElement.setAttribute("role", "alert");
  container.append(messageElement);
}

function makePortrait(name, className = "") {
  const image = document.createElement("img");
  image.src = portraitUrl(name);
  image.alt = `${name}`;
  image.loading = "lazy";
  if (className) image.className = className;
  image.addEventListener("error", () => {
    const placeholder = document.createElement("span");
    placeholder.className = ["portrait-placeholder", className].filter(Boolean).join(" ");
    placeholder.textContent = name.charAt(0).toLocaleUpperCase();
    placeholder.setAttribute("aria-label", `Portrait unavailable for ${name}`);
    image.replaceWith(placeholder);
  }, { once: true });
  return image;
}

function makeCharacterCard(character) {
  const card = document.createElement("article");
  card.className = "character-card";
  card.append(makePortrait(character.name));

  const info = document.createElement("div");
  info.className = "character-info";

  const name = document.createElement("h3");
  name.textContent = character.name;
  info.append(name);

  const role = document.createElement("p");
  role.className = "character-role";
  role.textContent = character.job || character.crew?.name || "Pirate";
  info.append(role);

  const bounty = document.createElement("p");
  bounty.className = "character-bounty";
  bounty.textContent = formatBounty(character.bounty);
  info.append(bounty);

  card.append(info);
  return card;
}

function renderCrew() {
  const byName = new Map(characters.map((character) => [normalizeName(character.name), character]));
  const crew = CORE_CREW.map((name) => byName.get(normalizeName(name))).filter(Boolean);
  if (crew.length === 0) {
    setMessage(crewList, "The crew data is unavailable right now. Please try again later.", true);
    return;
  }
  crewList.replaceChildren(...crew.map(makeCharacterCard));
}

function renderSearchResults() {
  const query = normalizeName(characterSearch.value.trim());
  searchResults.replaceChildren();
  if (!query) {
    setMessage(searchResults, "Search the character list.");
    return;
  }

  const matches = characters
    .filter((character) => normalizeName(character.name).includes(query))
    .slice(0, 10);

  if (matches.length === 0) {
    setMessage(searchResults, "No characters found.");
    return;
  }
  searchResults.replaceChildren(...matches.map(makeCharacterCard));
}

function renderBounties() {
  const direction = bountySort.value === "low" ? 1 : -1;
  const bounties = characters
    .filter((character) => Number(String(character.bounty ?? "").replace(/\D/g, "")) > 0)
    .sort((first, second) => (
      (Number(String(first.bounty).replace(/\D/g, "")) -
        Number(String(second.bounty).replace(/\D/g, ""))) * direction
    ))
    .slice(0, 10);

  if (bounties.length === 0) {
    setMessage(bountyList, "No bounty records are available right now.");
    return;
  }

  const rows = bounties.map((character, index) => {
    const row = document.createElement("li");
    row.className = "bounty-row";

    const rank = document.createElement("span");
    rank.className = "bounty-rank";
    rank.textContent = String(index + 1).padStart(2, "0");

    const portrait = makePortrait(character.name, "bounty-portrait");
    portrait.alt = "";

    const characterName = document.createElement("span");
    characterName.className = "bounty-name";
    characterName.textContent = character.name;

    const amount = document.createElement("span");
    amount.className = "bounty-amount";
    amount.textContent = formatBounty(character.bounty);

    row.append(rank, portrait, characterName, amount);
    return row;
  });
  bountyList.replaceChildren(...rows);
}

async function loadCharacters() {
  const response = await fetch(CHARACTERS_API);
  if (!response.ok) throw new Error(`Character API returned ${response.status}.`);

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Character API returned an unexpected response.");
  characters = data.filter((character) => character && typeof character.name === "string");
  if (characters.length === 0) throw new Error("Character API returned no character records.");
  renderCrew();
  renderBounties();
}

characterSearch.addEventListener("input", renderSearchResults);
bountySort.addEventListener("change", renderBounties);

loadCharacters().catch((error) => {
  setMessage(crewList, `Could not load the crew: ${error.message}`, true);
  setMessage(bountyList, `Could not load bounties: ${error.message}`, true);
});
