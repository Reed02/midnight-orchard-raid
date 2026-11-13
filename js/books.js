/* ===== LITTLE BOOKS: guides you can buy that explain how things work, kept on your bookshelf =====
   GUIDES are sold in the cottage shop (Books). Bought ones live in HOME.books { id: 1 } and stand on your bookshelf (or writing desk): using it
   opens the shelf (libraryScreen), with the old storybooks (BOOKS, cozy.js) beside them. A guide has a few short pages. */
const GUIDES = [
  { id: 'raid', title: 'Raiding by Moonlight', col: '#2c3e70', price: 25, pages: [
    'The goal of a raid is simple: carry apples to the den (the dashed circle) and bank them before dawn. Pick apples up from the ground, or stand by a tree and hold Shake to knock more loose. A shaken tree needs a while to grow them back.',
    'A bigger load is worth more, but you walk slower with it. Every apple you bank is yours to keep, even if you are caught afterwards.',
    'The red bar fills while a farmer\'s flashlight is on you. Duck behind a tree, a stone or a bush to break the line of sight. In a bush, farmers cannot see you at all and dogs only smell you from close by.',
    'Dogs follow your scent. Climb a tree to be safe, then Dash to slam down and stun the dogs below. Pick apples up one right after another for a combo. Loot spots (sawhorses, jar shelves, hives) drop materials, and those come home even if you are caught.'] },
  { id: 'daynight', title: 'Daylight and Nightfall', col: '#c27a2c', price: 25, pages: [
    'The orchard keeps one clock: a whole day and night takes about twelve real minutes, and your homestead and the Wilds share it.',
    'Raids happen at the time of day it is when you set out. At night it is dark and easy to hide. In daylight farmers see further and walk faster, and dogs smell you sooner, but you bring home 50% more: bank 10 apples and you get 15.',
    'At home the sky darkens at dusk. Inside the cottage the windows turn to night sky and the room grows dim, so lamps, lanterns, the fireplace and the stove matter after dark. To skip to morning, sleep in your bed.'] },
  { id: 'wilds', title: 'A Walk in the Wilds', col: '#3f6b3a', price: 30, pages: [
    'The Wilds are the big world outside your gate. Roads lead to the farms at the edges, and signposts at the crossroads point the way. Each farm has a raid gate at the end of its road.',
    'Pick what grows by the way with Shake. Berries, herbs and glowcaps heal you when you eat them; nuts and mushrooms sell at the market crate at home.',
    'A stash stump banks your bag, so you keep it even if you are knocked out, and you can travel back to any stump you have found. If your hearts run out you wake up at home and lose everything in your bag, so eat (H, or tap your hearts) before that happens.'] },
  { id: 'caves', title: 'Down in the Caves', col: '#4a3d5c', price: 35, pages: [
    'A cave has three floors of treasure, traps and creatures, with something big waiting at the bottom. The ladder you came down always takes you back out.',
    'Once you have opened a chest, you can stash your bag in it and it goes straight home. Every floor has one guaranteed chest, and a spring that fills your hearts once.',
    'Spikes pop up in a rhythm: wait for them to drop, or dash across. Pressure plates fire darts from the walls, so step round them. A cracked wall can be swiped open, and there is often a secret room behind it.',
    'On the last floor, the doors of the big hall shut until its owner is beaten. Fill your hearts at the spring first. Win, and a rope takes you up and out.'] },
  { id: 'farm', title: 'The Gardener\'s Almanac', col: '#6a8f2a', price: 30, pages: [
    'Start with a shovel from the yard shop: it digs paths, fills holes, and clears trees and rocks (trees go into storage, rocks give stone). Then a hoe to till the ground into beds.',
    'Plant with Seeds on tilled soil (pick Seeds again on the tool belt to change the crop). Crops grow on the real clock and never wilt, so there is no rush to come back.',
    'Carrots take 20 minutes, lettuce 45, beets an hour and a half, cabbages 3 hours and pumpkins 6. Watering a crop once halves the time it still needs. The can holds enough for 5 crops: refill it at the river, a rain barrel or a stone well.',
    'Harvests go to the pantry. Cook them indoors, or sell them at the market crate by the barn. A vegetable bed works the same way and needs no tools at all.'] },
  { id: 'helpers', title: 'Helpers in the Garden', col: '#8a5a2b', price: 30, pages: [
    'Compost bin: crops planted within 4 tiles of it grow 25% faster. Turn it once a day for a seed packet.',
    'Rain barrel: waters crops planted within 4 tiles of it as soon as they go in, and fills your watering can.',
    'Scarecrow: every harvest within 4 tiles of it gives one extra.',
    'Beehive: makes honeycomb. Flowers and clover within 5 tiles make it work quicker. Lamp post: lights up about 4 tiles round it at night. Apple tree: shake it once a day for apples. Berry bush: 2 berries a day. In build mode, hold a helper to see how far it reaches.'] },
  { id: 'build', title: 'Build It Your Way', col: '#5c6f7e', price: 25, pages: [
    'Press B (or Build) and point at anything to pick it up: furniture, crates, even the Raid Hut and the market. The big buildings move but cannot be put away.',
    'While holding something: R turns it, F flips it, Q puts it in storage, X sells it back for 60% of its price. Fences, stone walls and hedges join up when you put them next to each other, and you can walk through the rose arch.',
    'With a shovel you get the Ground tab: paint paths, decking, clover and tilled soil. Each tile can have natural, straight or curved edges; the Edge brush switches single tiles. Turn on Drag to paint whole stretches in one go.'] },
  { id: 'cottage', title: 'Inside the Cottage', col: '#7a3b3b', price: 30, pages: [
    'Build mode inside has its own tabs: Things, Floor (floor tiles, walls and doors), Walls, Windows and Wall art. Rooms adds a bedroom, kitchen or workshop.',
    'Paint costs 2 apples a wall tile; a wallpaper is unlocked once in the cottage shop, then costs 3 a tile. A window costs 25 apples and a glass jar. Windows and wall art go on the lower or the upper row of a wall: point at the row you want.',
    'Taking a picture down gives back half its price. A window lets daylight in during the day and shows the night sky after dark.'] },
  { id: 'cosy', title: 'A Cosy Home', col: '#b0546e', price: 25, pages: [
    'Furniture, garden helpers, paths and clover all add comfort. Comfort grows slower as you add more of the same, so variety helps. The things you started with do not count.',
    'Homely (10): crops grow 10% faster. Snug (30): 4 more seconds every night of a solo raid. Cosy (45): the market pays 10% more.',
    'Welcoming (60): 8 more seconds a night, and beehives work 25% faster. Beloved (90): 12 more seconds a night, and apple trees give an extra apple. The request board shows how far you are.'] },
  { id: 'friends', title: 'Neighbours and Friends', col: '#2f7a7a', price: 25, pages: [
    'Bramble the badger tells the story in the journal. Hazel the hedgehog sells materials for apples, but only so many of each a day: her stock comes back at midnight. Digby the mole digs up a gift every day. Each neighbour has a small favour to ask once a day.',
    'Swap friend codes to add a friend. Visitors can look round, leave notes and water plants; Gardeners can also plant and pick; Decorators can also move and place things. You choose for each friend.',
    'Letters and gifts reach friends who are offline through the mailbox. Crews share a hideout you build together.'] },
];
const guide = id => GUIDES.find(b => b.id === id);
const booksOwned = () => (HOME.books && typeof HOME.books === 'object' ? HOME.books : (HOME.books = {}));
const BOOKICON = {};
function bookIcon(b) {                                                // a little cover: its colour, a band and the first letter
  if (BOOKICON[b.id]) return BOOKICON[b.id]; const c = document.createElement('canvas'); c.width = 40; c.height = 48; const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(9, 6, 26, 38); x.fillStyle = b.col; x.fillRect(7, 4, 26, 38); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(7, 4, 4, 38);
  x.fillStyle = '#f2e3b8'; x.fillRect(13, 12, 16, 3); x.fillRect(13, 33, 16, 2); x.font = 'bold 13px Georgia,serif'; x.textAlign = 'center'; x.fillText(b.title.replace(/^(The|A|An) /, '')[0], 21, 28);
  return (BOOKICON[b.id] = c.toDataURL());
}
function buyGuide(id) { const b = guide(id); if (!b || booksOwned()[id] || !spendApples(b.price)) return buildShop('buy'); booksOwned()[id] = 1; homeSave(); try { sfxPlay('gold'); } catch (e) {} say('"' + b.title + '" is on your bookshelf'); buildShop('buy'); }
function libraryScreen() {
  const own = booksOwned(), have = GUIDES.filter(b => own[b.id]);
  const spines = GUIDES.map(b => own[b.id] ? `<button class="spine" style="--bk:${b.col}" onclick="guideScreen('${b.id}',0)" title="${esc(b.title)}"><span>${esc(b.title)}</span></button>` : `<span class="spine gap" title="Not on your shelf yet"></span>`).join('');
  homeScreen(`<h1>Your bookshelf</h1><p class="tag">${have.length ? 'Little books on how things work. Pick one to read.' : 'No guides yet: little books on how things work are in the cottage shop (Build, Shop, Books).'} ${have.length}/${GUIDES.length} guides.</p>
  <div class="shelf">${spines}</div><div class="row"><button onclick="bookScreen(COZY.book||0)">Read a story instead</button><button onclick="leaveHomeScreen()">Close</button></div>`, 'library');
}
function guideScreen(id, pg) {
  const b = guide(id); if (!b || !booksOwned()[id]) return libraryScreen(); pg = Math.max(0, Math.min(b.pages.length - 1, pg | 0));
  homeScreen(`<h1>${esc(b.title)}</h1><div class="cards"><div class="card book guidepage" style="--bk:${b.col}">${esc(b.pages[pg])}</div></div><p class="lbl">Page ${pg + 1} of ${b.pages.length}</p>
  <div class="row">${pg > 0 ? `<button onclick="guideScreen('${id}',${pg - 1})">Previous page</button>` : ''}${pg < b.pages.length - 1 ? `<button onclick="guideScreen('${id}',${pg + 1})">Next page</button>` : ''}<button onclick="libraryScreen()">Back to the shelf</button><button onclick="leaveHomeScreen()">Put it back</button></div>`, 'guide');
}
/* shop: the Books category in the cottage shop */
const _buildShopG = buildShop;
buildShop = function (tab, cat) {
  _buildShopG(tab, cat); if (!HOME_IN || HIDE || shopTab !== 'buy' || !['All', 'Books'].includes(shopCatSel)) return; const grid = document.querySelector('#ov .shop2'); if (!grid) return;
  grid.insertAdjacentHTML('beforeend', GUIDES.map(b => { const own = booksOwned()[b.id]; return shopCard(`buyGuide('${b.id}')`, bookIcon(b), b.title, own ? 'On your shelf' : costHtml({ apples: b.price }), { disabled: own || HOME.apples < b.price, dim: own, badge: own ? '&#10003;' : '', title: b.title + ': a little book on how things work. Read it at your bookshelf or writing desk.' }); }).join(''));
};
