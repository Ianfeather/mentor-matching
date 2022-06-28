const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const yargs = require('yargs');

const { file, output } = yargs
  .option('file', {
    alias: 'f',
    description: 'path to the csv file',
    type: 'string'
  })
  .option('output', {
    alias: 'o',
    description: 'path to write the output csv file',
    type: 'string'
  })
  .help().argv;

const rawFormData = parse(fs.readFileSync(file, 'utf-8'));

const headings = [
  'timestamp', 'email',	'type', 'count', 'organisation', 'requested organisation','manager', 'match requests', 'notes'
]

const data = rawFormData
  .map(row => {
    return row.reduce((acc, next, idx) => {
      acc[headings[idx]] = next;
      return acc;
    }, {})
  })
  // convert "boths" to a mentee row and a mentor row
  .flatMap(row => {
    if (row.type !== 'Both') return row;
    return [
      { ...row, type: 'Mentor' },
      { ...row, type: 'Mentee' }
    ]
  })
  // duplicate rows based on number of mentees they're open to
  .flatMap(row => {
    const count = parseInt(row.count, 10) || 1;
    // Remove count from the object
    const { count:_ , ...newRow } = row;
    return (count > 1 && row.type === 'Mentor') ?
      Array(count).fill(newRow) :
      newRow;
  })
  .sort((a,b) => {
    // sort so that people who requested others are at the top
    if (!!a['match requests'] && !b['match requests']) {
      return -1;
    }
    // Then sort based on type (mentor/mentee)
    if (a.type === b.type) return 0;
    return a.type > b.type ? 1 : -1
  })
  // Convert to array to match the format of the matching spreadsheet
  .map(row => ([
    row.type === "Mentor" ? row.email : '', // Mentor
    row.type === "Mentee" ? row.email : '', // Mentee
    row.type === "Mentor" ? row.notes : '', // Mentor Notes
    row.type === "Mentee" ? row.notes : '', // Mentee Notes
    row['match requests'], // Matching Notes
    row.type === "Mentor" ? row.manager : '', // Mentor manager email address
    row.type === "Mentee" ? row.manager : '', // Mentee manager email address

  ]))

const matchingData = stringify(data);

if (output) {
  fs.writeFileSync(output, matchingData, 'utf-8');
} else {
  console.log(matchingData);
}

