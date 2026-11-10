/* VIKRAM Stories catalog. Card text lives in stories/<id>.js (loaded on demand). Images are public-domain or Creative Commons files from Wikimedia Commons; credits in IMG. */
var VK_STORIES = {
  SERIES: [
    { id: 'alexander', t: 'Alexander the Great', sub: 'From Pella to the Punjab in 13 years', span: 26, land: 'med', color: '#b5652b',
      cover: 'alex_map', primary: [['Arrian, The Anabasis of Alexander (tr. Chinnock, 1884)', 'https://www.gutenberg.org/ebooks/46976'], ['Plutarch, Life of Alexander (in Lives vol. 3, tr. Long)', 'https://www.gutenberg.org/ebooks/14140']] },
    { id: 'greekmyths', t: 'Greek mythology', sub: 'Gods, monsters, heroes and Troy', span: 9, land: 'med', color: '#2f6f8f',
      cover: 'olympus', primary: [['Hesiod, Theogony (tr. Evelyn-White, 1914)', 'https://www.gutenberg.org/ebooks/348'], ['Homer, The Iliad (tr. Butler)', 'https://www.gutenberg.org/ebooks/2199'], ['Homer, The Odyssey (tr. Butler)', 'https://www.gutenberg.org/ebooks/1727'], ['Ovid, Metamorphoses I–VII', 'https://www.gutenberg.org/ebooks/21765']] },
    { id: 'europe', t: 'Europe in 33 moments', sub: 'Knossos to the European Union', span: 22, land: 'med', color: '#6b5b95',
      cover: 'parthenon', primary: [] },
    { id: 'nazigermany', t: 'How democracy died: Germany 1918–39', sub: 'From defeat to dictatorship to war', span: 14, land: 'med', color: '#7a3b3b',
      cover: 'reichstag', primary: [['US Holocaust Memorial Museum: Holocaust Encyclopedia', 'https://encyclopedia.ushmm.org/']] },
    { id: 'ww2', t: 'World War II', sub: '1939–1945, including India\'s war', span: 34, land: 'world', color: '#3d5a40',
      cover: 'dday', primary: [['US Holocaust Memorial Museum: Holocaust Encyclopedia', 'https://encyclopedia.ushmm.org/']] }
  ],
  TAGS: { fact: ['Fact', 'Well established by sources and historians'], debated: ['Debated', 'Sources or historians disagree; both sides shown'], legend: ['Legend', 'An ancient story that may not be true'], myth: ['Myth', 'A traditional story, not history'] },
  IMG: {}
};
if (typeof module !== 'undefined') module.exports = VK_STORIES;
