import figlet from 'figlet';
import standard from 'figlet/importable-fonts/Standard.js';
import slant from 'figlet/importable-fonts/Slant.js';
import big from 'figlet/importable-fonts/Big.js';
import small from 'figlet/importable-fonts/Small.js';
import banner from 'figlet/importable-fonts/Banner.js';
import block from 'figlet/importable-fonts/Block.js';
import doom from 'figlet/importable-fonts/Doom.js';
import shadow from 'figlet/importable-fonts/Shadow.js';
import ansi from 'figlet/importable-fonts/ANSI Shadow.js';
import digital from 'figlet/importable-fonts/Digital.js';
import { $, el, live, msg } from '../js/tk.js';

const FONTS = { Standard: standard, Slant: slant, Big: big, Small: small, Banner: banner, Block: block, Doom: doom, Shadow: shadow, 'ANSI Shadow': ansi, Digital: digital };
for (const [n, d] of Object.entries(FONTS)) figlet.parseFont(n, d);
$('#font').append(...Object.keys(FONTS).map((n) => el('option', { value: n, text: n })));
live([$('#in'), $('#font'), $('#lay')], () => {
  try { $('#out').textContent = figlet.textSync($('#in').value, { font: $('#font').value, horizontalLayout: $('#lay').value }); msg($('#msg'), ''); }
  catch (e) { msg($('#msg'), e.message); }
});
