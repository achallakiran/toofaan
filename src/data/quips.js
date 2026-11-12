/* data: Toofan's punch lines, shown in speech bubbles (no voices). Ravi's two lines first; the rest written in the same filmy, cringe
   style for him to change freely. {N} is filled with how many men are standing. A line with a reply gets an answer from the nearest goon. */
'use strict';

/* walking into a brawl, seeing the men waiting for him */
var BRAWL = [
  { line: 'KITNE AADMI HAI?', reply: '{N}...' },
  { line: 'AREY PAPPU, TU PHIR AA GAYA MAAR KHAANE?' },
  { line: 'ITNE SAARE? AAJ TOH WARM-UP HO JAAYEGA.' },
  { line: 'LINE MEIN AAO. SABKA NUMBER AAYEGA.' },
  { line: 'TUM LOG PHIR SE? GHAR PE KOI KAAM NAHI HAI KYA?' },
  { line: '{N} LOG? BAS? MUJHE LAGA PARTY HAI.' },
  { line: 'RUKO RUKO... PEHLE GAANA LAGANE DO.' }
];
/* on the bike: a chase starting, a goon knocked off, the chase won */
var RIDE = {
  start: ['AAJA, RACE LAGA LE!', 'PEECHHA? MERA? ACHHA MAZAAK THA.', 'HELMET PEHNA HAI NA? ACHHA HAI.', 'CHALO, THODA EXERCISE HO JAAYE.'],
  ko: ['BYE BYE PAPPU!', 'SADAK PE DHYAAN DE, BHAI!', 'GIR GAYA? KOI BAAT NAHI.', 'NEXT!'],
  won: ['GAADI KI EMI ABHI BAAKI THI?', 'TOOFAN SE PANGA? NAHI.', 'AUR KOI?']
};

module.exports = { BRAWL: BRAWL, RIDE: RIDE };
