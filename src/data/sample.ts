import type { Dataset } from '../types';

/**
 * Sample data used when no Google Sheet is configured (local development and
 * tests). It mirrors data-template/, which is the starting content for the sheet.
 */
export const sampleDataset: Dataset = {
  fellows: [
    {
      id: 'yohannan',
      name: 'Yohannan K Philip',
      firstName: 'Yohannan',
      headlineRole: 'Grade 5 Teacher',
      headlineHighlight: 'TFI Fellow',
      statusText: 'Teaching in Bengaluru',
      intro:
        'I teach all subjects to 37 students at Sunshine Primary & High School. Here I share the lessons, worksheets and classroom systems that work in my room.',
      school: 'Sunshine Primary & High School',
      city: 'Bengaluru',
      cohort: '2026',
      photoUrl: '',
    },
  ],
  resources: [
    {
      id: 'yohannan-fractions-rotis',
      fellowId: 'yohannan',
      title: 'Fractions with rotis',
      subject: 'Maths',
      grade: 'Grade 5',
      length: '6 blocks',
      tags: ['NCERT', 'Maths Mela', 'Ch 2'],
      coverUrl: '',
      summary:
        'Groups share three newspaper rotis, build their own fraction kits, then play into comparing fractions.',
      description:
        'A compressed fractions unit that starts with real sharing. Table groups divide three newspaper rotis among themselves, draw their own 12 cm fraction kits, and play their way into comparing and equivalent fractions through Fraction War and an outdoor game.',
      driveLink: '',
      files: [
        { name: 'Unit plan with tiered KUD objectives', link: '', order: 1 },
        { name: 'Fraction kit steps (hand-drawn, 12 cm)', link: '', order: 2 },
        { name: 'Fraction War card decks', link: '', order: 3 },
        { name: '“Overboard!” outdoor game', link: '', order: 4 },
        { name: '8-station Worksheet Wall rotation', link: '', order: 5 },
        { name: '20- and 30-mark unit tests with Challenge Zone', link: '', order: 6 },
      ],
      media: [],
    },
    {
      id: 'yohannan-angles-turns',
      fellowId: 'yohannan',
      title: 'Angles as turns',
      subject: 'Maths',
      grade: 'Grade 5',
      length: '5 days',
      tags: ['NCERT', 'Maths Mela', 'Ch 3'],
      coverUrl: '',
      summary:
        'Five days of making angles by hand: a paper fan, a folded square-paper angle tool, and turning clock hands.',
      description:
        'Students make angles with their hands before naming them: the paper fan from the textbook (p. 34), an angle tool folded from square paper cut from A4, and clock hands turning 0, 15, 30, 45 and 60 minutes. Day 5 moves to direction and real turns.',
      driveLink: '',
      files: [
        { name: 'Five daily lesson plans with notebook notes', link: '', order: 1 },
        { name: 'A4 cutting templates (square and circle)', link: '', order: 2 },
        { name: 'Slide decks for each day', link: '', order: 3 },
        { name: 'Whole-chapter revision Q&A', link: '', order: 4 },
      ],
      media: [],
    },
    {
      id: 'yohannan-chewing-gum',
      fellowId: 'yohannan',
      title: 'Keep Trying: The Chewing Gum Story',
      subject: 'English',
      grade: 'Grade 5',
      length: '60 min',
      tags: ['Original', 'Reading comprehension'],
      coverUrl: '',
      summary:
        'An original passage for teaching inference: “I think ___ because the text says ___.”',
      description:
        "An original passage about how chewing gum came about, written to teach one skill: using evidence from the text to infer why people acted the way they did. The Big Question: why does trying new things matter, even when we're not sure it'll work?",
      driveLink: '',
      files: [
        { name: 'Passage and worksheet (black and white)', link: '', order: 1 },
        { name: '“How Detectives Think” worked example', link: '', order: 2 },
        { name: 'Vocabulary activity (7 words)', link: '', order: 3 },
        { name: 'Lesson plan', link: '', order: 4 },
        { name: 'Answer key', link: '', order: 5 },
      ],
      media: [],
    },
    {
      id: 'yohannan-the-rainbow',
      fellowId: 'yohannan',
      title: 'The Rainbow',
      subject: 'English',
      grade: 'Grade 5',
      length: '3 days',
      tags: ['Santoor', 'Unit 2', 'Ch 3'],
      coverUrl: '',
      summary:
        "Christina Rossetti's poem over three days: meaning, word play, recitation, grammar and colour mixing.",
      description:
        'Day 1 covers the poem and comprehension. Day 2 is word play: anagrams, a spin-wheel, rhyming and a three-voice recitation. Day 3 brings compound words, a journey paragraph, nouns and verbs, and colour mixing.',
      driveLink: '',
      files: [
        { name: 'Three slide decks', link: '', order: 1 },
        { name: 'Three lesson plans', link: '', order: 2 },
        { name: 'Notebook-notes handouts with sentence frames', link: '', order: 3 },
        { name: 'Answer key for every textbook activity', link: '', order: 4 },
      ],
      media: [],
    },
    {
      id: 'yohannan-community',
      fellowId: 'yohannan',
      title: 'Community',
      subject: 'EVS',
      grade: 'Grade 5',
      length: '5 days',
      tags: ['KSEEB', 'Ch 3', 'pp. 31–51'],
      coverUrl: '',
      summary:
        'Rural, urban and tribal communities, a food-chain activity on how we depend on each other, and help during disasters.',
      description:
        'Day 1 covers what makes a community. Days 2 to 4 cover rural, urban and tribal life. Day 5 brings a food-chain activity on interdependence, other kinds of community, and how communities help during natural disasters.',
      driveLink: '',
      files: [
        { name: 'Five lesson plans with a daily Do Now', link: '', order: 1 },
        { name: 'Slide decks (timer and voice level on every slide)', link: '', order: 2 },
        { name: 'One consolidated set of student notes', link: '', order: 3 },
        { name: 'Page-by-page textbook answer key', link: '', order: 4 },
        { name: '20-mark unit test', link: '', order: 5 },
      ],
      media: [],
    },
    {
      id: 'yohannan-family',
      fellowId: 'yohannan',
      title: 'Family',
      subject: 'EVS',
      grade: 'Grade 5',
      length: '',
      tags: ['KSEEB', 'Ch 2', 'pp. 19–30'],
      coverUrl: '',
      summary:
        'Family trees, relationships, joint and nuclear families, and a neighbourhood household survey.',
      description:
        'Family tree symbols, naming relationships, joint and nuclear families, and how neighbours help each other, ending with a household survey of the neighbourhood.',
      driveLink: '',
      files: [
        { name: 'Unit plan', link: '', order: 1 },
        { name: 'Neighbourhood household survey', link: '', order: 2 },
        {
          name: '20-mark, 45-minute unit test (ends with drawing a family tree)',
          link: '',
          order: 3,
        },
      ],
      media: [],
    },
    {
      id: 'yohannan-food-health',
      fellowId: 'yohannan',
      title: 'Our Food, Our Health',
      subject: 'EVS',
      grade: 'Grade 5',
      length: '10 days',
      tags: ['Holiday project', 'Nutrition'],
      coverUrl: '',
      summary:
        'A seven-day food diary and a Kitchen Detective task where students read a real nutrition label at home.',
      description:
        'Given before the holiday break so students arrive at the nutrition unit with their own data. They keep a seven-day food diary and choose one task, such as Kitchen Detective, where they read a real nutrition label at home.',
      driveLink: '',
      files: [
        { name: 'Landscape A4 worksheet (black and white)', link: '', order: 1 },
        { name: 'Seven-day food diary', link: '', order: 2 },
        { name: 'Choose-one tasks', link: '', order: 3 },
      ],
      media: [],
    },
    {
      id: 'yohannan-the-crew',
      fellowId: 'yohannan',
      title: 'The Crew',
      subject: 'Classroom culture',
      grade: 'Grade 5',
      length: 'All year',
      tags: ['Whole class', 'Classroom culture'],
      coverUrl: '',
      summary:
        'Captain and Crew roles, a 0–4 voice-level scale, a daily Do Now, and a restorative path for conflict.',
      description:
        "A shared way of running the room: Captain and Crew roles, a 0–4 voice-level scale, a Do Now on the board every lesson, and a restorative path for conflict: Harbour, What Happened, Back on Deck, Ship's Log. “We are a crew. We sail together, we look after our own, and we make this a room where everyone can think, learn, and feel safe.”",
      driveLink: '',
      files: [
        { name: 'Roles and vision statement', link: '', order: 1 },
        { name: 'Voice-level chart and hand signal cards', link: '', order: 2 },
        { name: 'Restorative accountability ladder', link: '', order: 3 },
        { name: 'O-soji team cleaning ritual', link: '', order: 4 },
        { name: 'Weekly goals wall poster', link: '', order: 5 },
      ],
      media: [],
    },
  ],
};
