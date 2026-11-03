export interface Character {
  index: number
  id: string
  name: string
  description: string
  traits: string[]
  traitIds: string[]
}

// Generate 165 characters with zero-padded IDs, each with ONE corresponding trait
// Rarity list — every raider not listed here is Common
const RARE_IDS = new Set(["071", "066", "161", "122", "165", "060", "056", "154", "133", "148", "027", "032", "038", "155", "102", "094", "106", "121", "044", "082"])
const PERMARARE_IDS = new Set(["042", "100", "020", "117", "076", "147", "096"])

/** One-line bio per raider, shown under the menu */
const DESCRIPTIONS: Record<string, string> = {
  "001": "The best pilot the Raiders ever had. Some say he's never set foot on land.",
  "002": "Never takes off his pilot goggles. Mostly to hide the bald spot.",
  "003": "Loves two things: permanent data and chain-smoking.",
  "004": "HyperBEAM node operator. 99.9% uptime, 0% social life.",
  "005": "If it's not on HyperBEAM, he's not interested.",
  "006": "Achieved oneness with HyperBEAM. Hasn't blinked since.",
  "007": "Read Orwell once. Hasn't trusted a bureaucrat since.",
  "008": "Wasn't born blue. Just severely nutrient deficient.",
  "009": "Street smart, wallet smarter. Hasn't clicked a link since 2017.",
  "010": "Allergic to centralized systems. Won't even take the suit off to sleep.",
  "011": "Wore the hazmat suit for Halloween once. Never got round to taking it off.",
  "012": "Lives in a tent. Extremely vegan. The cow suit is a solidarity thing.",
  "013": "Leopard-print HODL vest. Bought the top, wore it anyway.",
  "014": "Bought every dip since 2018. Still HODLing, still not sure why.",
  "015": "Stared at red candles so long he came out spotted. Still HODLing.",
  "016": "Jacket says PERMA, face tattoos say regret. Neither is coming off.",
  "017": "Red goggles, red face. Nobody knows which came first.",
  "018": "Bitcoin on the helmet, designer on the back. Bought the jacket at the top.",
  "019": "Went to the moon. Spent the whole trip watching charts on his visor.",
  "020": "Made it to the moon. Came back solid gold.",
  "021": "Packed for the moon in a picnic blanket. Mission control still has questions.",
  "022": "CRYPTO tattooed on his forehead. Commitment issues: none.",
  "023": "Same ink, different chain. Still explains gas fees at family dinners.",
  "024": "WAGMI GANG across the chest. Has never checked whether they did.",
  "025": "NGMI tattoo, fresh bandages. He was right.",
  "026": "Gold OG chain, rekt tattoo. The chain is the last thing he didn't sell.",
  "027": "Wears the silver OG chain. Lost the gold one on a leverage trade.",
  "028": "Wears glasses to read the charts. Got rekt in high definition.",
  "029": "Power level over 9,000. Portfolio level, considerably less.",
  "030": "Conquers planets on weekends. Still asks the squad to reset his password.",
  "031": "DumDum obsessed. Has been blocked twice now.",
  "032": "Taxation is theft, and he'll tell you. At length. Unprompted.",
  "033": "Same hat, same rant, now in hi-vis so you can't miss it.",
  "034": "The only Raider who's also a Namekian. Very self-conscious about it.",
  "035": "Powered up so hard he stopped being green. Has never been happier.",
  "036": "1984 on the shirt, an eye on the cap. Watches the watchers.",
  "037": "Read the book, bought the tracksuit. Won't use anything with 'cloud' in the name.",
  "038": "Writes for the Permaweb Journal. Every typo is preserved forever.",
  "039": "Permaweb Journal editor. Never issues corrections. Nothing can be deleted.",
  "040": "Might be Satoshi. Might be a cryptography professor. Might be both.",
  "041": "Says he's Satoshi. Has never moved a single coin to prove it.",
  "042": "Definitely Satoshi. Wrote the whitepaper, kept the suit.",
  "043": "Says he was the original DumDum. The mascot's lawyers disagree.",
  "044": "Prince of a fallen planet. Now runs the squad group chat.",
  "045": "Same armour, no colour. Still insists he's the main character.",
  "046": "Wears the jersey to every game. Has never seen a baseball.",
  "047": "Hit one home run in 2019. Still wears the jersey to prove it.",
  "048": "Swallowed a whole bear market. Still digesting.",
  "049": "Venomous in the replies. Harmless in real life.",
  "050": "Knows everything about scaling. He’s covered in them.",
  "051": "WEB3 in gold, glasses in red. Can't explain either.",
  "052": "Says 'Web3' in every sentence. Even the ones about lunch.",
  "053": "Streams eighteen hours a day. Six viewers, all alts.",
  "054": "Crying rainbow tears onto a pile of cash. Bull market feelings.",
  "055": "Tie-dye shirt, money chain. Peace, love and leverage.",
  "056": "Can't play a single instrument. Every record he touches goes platinum.",
  "057": "Never adds anything. Only removes. Except from the permaweb.",
  "058": "Early years. Same shades, darker beard, already knew what the record needed.",
  "059": "Kung-fu master. Trains the squad, mostly in napping.",
  "060": "Master of the turtle style. Moves slow, never sells.",
  "061": "AO patch on the jacket. Cold outside, hot takes inside.",
  "062": "Rainbow puffer, pink beanie, face tattoo. Subtle was never an option.",
  "063": "Balaclava on, eyes only. Very private. His keys even more so.",
  "064": "Been rugged so many times he's just bones now.",
  "065": "Wears half a suit of armour. Couldn't afford the rest after gas fees.",
  "066": "Got his party hat at the 2001 drop party. Still won't sell.",
  "067": "Doubling money at the Grand Exchange. Trust him.",
  "068": "Got his dragon gear the honest way. Four thousand hours of fishing.",
  "069": "Red pill or blue pill. Either way, the receipt's on-chain.",
  "070": "Showed you how deep the rabbit hole goes. It's permanent.",
  "071": "What if I told you the cloud is just someone else's computer?",
  "072": "Lives in the woods. Runs a node off a single solar panel.",
  "073": "Up at dawn every day to check the uptime.",
  "074": "Business up front, backups in the back.",
  "075": "Old sailor. Tells dot-com crash stories nobody asked for.",
  "076": "Runs the family business. Don't ask which family.",
  "077": "Collects debts and receipts. On-chain only.",
  "078": "Made you an offer. It's permanent.",
  "079": "Only lights a cigar once the deal is final.",
  "080": "CHEF on the cap, mask on the face. Let him cook.",
  "081": "Still cooking. The smoke alarm's been going since 2021.",
  "082": "Cooks in shades. Nobody has ever eaten anything.",
  "083": "Flames on the shirt, flames in the kitchen. Has been asked to leave.",
  "084": "Peace beads and an army jacket. Mixed messages, consistent vibes.",
  "085": "Doesn't believe in rules. Does believe in backups.",
  "086": "Still at the festival from 2017. Won't say which one.",
  "087": "Black and white, all business. The hippie phase is over.",
  "088": "Orc warlord. Bunny charm on his belt. Don't mention the bunny.",
  "089": "Spiked shoulders, gentle soul. Cries at mint launches.",
  "090": "Grey-bearded orc. Remembers when gas was free.",
  "091": "Red orc, red mood. Just got liquidated.",
  "092": "Cuts through FUD with a single swing. Has never drawn the sword.",
  "093": "Monochrome samurai. Lost his colours in the bear market.",
  "094": "Slays demons, mostly in the comments section.",
  "095": "Never misses, never panic-sells.",
  "096": "Test subject 01. DON'T FUD tattooed on his head. The experiment worked.",
  "097": "Subject 02. Same tattoo, slightly more FUD.",
  "098": "Subject 03. Escaped the lab. Took the chain.",
  "099": "Subject 04. Still in the lab. Likes it there.",
  "100": "The protocol is the way. He commits straight to main.",
  "101": "Swears he isn't Sam. Same hair, same lanyard, same laptop.",
  "102": "Name tag says WOJAK. Insists it's a coincidence.",
  "103": "Feels every candle. Personally.",
  "104": "Halo, wings, Pepe tee. Rare, and he knows it.",
  "105": "Much holy. Very blessed. Wow.",
  "106": "Lives in the frog onesie. Pockets full of snacks.",
  "107": "You read his shirt. That's your one interaction for today.",
  "108": "Socialises strictly through message passing.",
  "109": "Gives out pure raw alpha for free. It's never right.",
  "110": "Sells signals he doesn't follow himself.",
  "111": "Went down with the ship. Came back with the treasure.",
  "112": "Steampunk alpha. Times his trades with a pocket watch.",
  "113": "Rides into town, deploys a contract, rides out.",
  "114": "Wanted on six chains. Bridges them all anyway.",
  "115": "Robs banks. Only the centralized ones.",
  "116": "The quiet one. Only speaks to say 'draw'.",
  "117": "Number 001. First in line for everything, including mints.",
  "118": "Number 002. Has never forgiven 001.",
  "119": "Number 003. Fastest jacket, slowest wallet.",
  "120": "Visible from orbit. Invisible on-chain.",
  "121": "Gotta catch 'em all. Still missing one: profit.",
  "122": "Hooded fighter. 'Get over here' is also how he onboards friends.",
  "123": "Big fan of cold storage. Literally.",
  "124": "Changes colour to match the market.",
  "125": "Fatality? Only for his portfolio.",
  "126": "Senses a disturbance in the mempool.",
  "127": "Leaps from great heights. Always lands in the dip.",
  "128": "Turned to the dark side after a bad airdrop.",
  "129": "Talks to trees. They mostly talk about storage.",
  "130": "Survived the last ice age and the last bear market.",
  "131": "Lives in the swamp. Speaks in grunts and transaction IDs.",
  "132": "Pure rage. Mostly about gas fees.",
  "133": "Exists in every block at once. Stopped bothering with clothes shortly after.",
  "134": "Discreet about everything except the coat.",
  "135": "Low profile, high volume.",
  "136": "YOLO SPORT. Has never done anything twice.",
  "137": "YOLO on the jacket, YOLO in the portfolio.",
  "138": "Lived once. Liquidated twice.",
  "139": "Athletic wear, zero athletics.",
  "140": "Peaked in a bull run nobody else remembers.",
  "141": "Reads every whitepaper. All of it. For fun.",
  "142": "Rustles validators for a living.",
  "143": "Wears the white hat. One of the good guys, allegedly.",
  "144": "Headbangs to the sound of block confirmations.",
  "145": "Only listens to vinyl and full nodes.",
  "146": "Neon mankini, zero shame. Says it's for aerodynamics.",
  "147": "Came to learn about the culture of the permaweb. Very nice.",
  "148": "Back on the block. Ah, here we go again.",
  "149": "Repping San Andreas. Has never once followed the train.",
  "150": "Five stars and counting.",
  "151": "Fastest bridge in the south.",
  "152": "Wins every race. Loses every set of keys.",
  "153": "Red light, green light. Doesn't move when the market does.",
  "154": "Never blinks first.",
  "155": "Throws fireballs at FUD.",
  "156": "Best friend, worst rival. Depends on the round.",
  "157": "Embraced the dark side and 100x leverage.",
  "158": "Mines everything except crypto.",
  "159": "Turns up to parties uninvited. Sssss.",
  "160": "Player 001. Just a harmless old man. Probably.",
  "161": "Player 001, after the games. The tracksuit has seen things.",
  "162": "Triangle mask, pink hoodie. Just following orders.",
  "163": "Runs the game. Never loses the data.",
  "164": "Plumber by trade, raider by choice. The spikes are for turtles.",
  "165": "Always player two. Finally got his own rare.",
}

export const characters: Character[] = Array.from({ length: 165 }, (_, i) => {
  const index = i + 1
  const id = String(index).padStart(3, "0")
  const traitId = `trait${id}` // Simple 1:1 mapping

  return {
    index,
    id,
    name: `Raider ${id}`,
    description: DESCRIPTIONS[id] ?? "",
    traits: [PERMARARE_IDS.has(id) ? "PermaRare" : RARE_IDS.has(id) ? "Rare" : "Common"],
    traitIds: [traitId],
  }
})

export function getCharacterById(id: string): Character | undefined {
  return characters.find((char) => char.id === id)
}

export type Rarity = "Common" | "Rare" | "PermaRare"

export function getRarity(id: string | null | undefined): Rarity {
  if (!id) return "Common"
  return (getCharacterById(id)?.traits[0] as Rarity) ?? "Common"
}

/** Background class for a raider's art: silver for Rare, gold for PermaRare, none for Common */
export function rarityBgClass(rarity: Rarity): string | null {
  return rarity === "PermaRare" ? "rarity-gold" : rarity === "Rare" ? "rarity-silver" : null
}
