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
      board: 'NCERT',
      chapter: 'Maths Mela · Ch 2',
      length: '6 blocks',
      summary:
        'Groups share three newspaper rotis, build their own fraction kits, then play into comparing fractions.',
      about:
        'A compressed fractions unit that starts with real sharing. Table groups divide three newspaper rotis among themselves, draw their own 12 cm fraction kits, and play their way into comparing and equivalent fractions through Fraction War and an outdoor game.',
      inMyClassroom:
        'Groups of four split three rotis more easily than groups of five, but every group finished. We made a wall picture of three rotis shared among four. Most students can now say which of two unit fractions is bigger.',
      whatIdChange:
        "Many students can't yet divide (11 ÷ 4), so word problems now always divide evenly. The concept carries the difficulty, not the arithmetic.",
      driveLink: '',
      files: [
        {
          name: 'Unit plan with tiered KUD objectives',
          link: '',
          order: 1,
        },
        {
          name: 'Fraction kit steps (hand-drawn, 12 cm)',
          link: '',
          order: 2,
        },
        {
          name: 'Fraction War card decks',
          link: '',
          order: 3,
        },
        {
          name: '“Overboard!” outdoor game',
          link: '',
          order: 4,
        },
        {
          name: '8-station Worksheet Wall rotation',
          link: '',
          order: 5,
        },
        {
          name: '20- and 30-mark unit tests with Challenge Zone',
          link: '',
          order: 6,
        },
      ],
    },
    {
      id: 'yohannan-angles-turns',
      fellowId: 'yohannan',
      title: 'Angles as turns',
      subject: 'Maths',
      grade: 'Grade 5',
      board: 'NCERT',
      chapter: 'Maths Mela · Ch 3',
      length: '5 days',
      summary:
        'Five days of making angles by hand: a paper fan, a folded square-paper angle tool, and turning clock hands.',
      about:
        'Students make angles with their hands before naming them: the paper fan from the textbook (p. 34), an angle tool folded from square paper cut from A4, and clock hands turning 0, 15, 30, 45 and 60 minutes. Day 5 moves to direction and real turns.',
      inMyClassroom:
        'Students already knew clockwise and anticlockwise, so Day 5 got harder: a multi-step turns example, a tougher exit ticket and an extension reasoning question.',
      whatIdChange: '',
      driveLink: '',
      files: [
        {
          name: 'Five daily lesson plans with notebook notes',
          link: '',
          order: 1,
        },
        {
          name: 'A4 cutting templates (square and circle)',
          link: '',
          order: 2,
        },
        {
          name: 'Slide decks for each day',
          link: '',
          order: 3,
        },
        {
          name: 'Whole-chapter revision Q&A',
          link: '',
          order: 4,
        },
      ],
    },
    {
      id: 'yohannan-chewing-gum',
      fellowId: 'yohannan',
      title: 'Keep Trying: The Chewing Gum Story',
      subject: 'English',
      grade: 'Grade 5',
      board: 'Original',
      chapter: 'Reading comprehension',
      length: '60 min',
      summary:
        'An original passage for teaching inference: “I think ___ because the text says ___.”',
      about:
        "An original passage about how chewing gum came about, written to teach one skill: using evidence from the text to infer why people acted the way they did. The Big Question: why does trying new things matter, even when we're not sure it'll work?",
      inMyClassroom:
        "We couldn't get through the whole passage in one period. I had first framed the story as a happy accident, then changed it to persistence, because the text shows people trying again and again.",
      whatIdChange:
        'Teacher read-aloud instead of echo reading. The core is Do Now, reading and modelled inference in about 35 minutes. Vocabulary and the written response move to homework.',
      driveLink: '',
      files: [
        {
          name: 'Passage and worksheet (black and white)',
          link: '',
          order: 1,
        },
        {
          name: '“How Detectives Think” worked example',
          link: '',
          order: 2,
        },
        {
          name: 'Vocabulary activity (7 words)',
          link: '',
          order: 3,
        },
        {
          name: 'Lesson plan',
          link: '',
          order: 4,
        },
        {
          name: 'Answer key',
          link: '',
          order: 5,
        },
      ],
    },
    {
      id: 'yohannan-the-rainbow',
      fellowId: 'yohannan',
      title: 'The Rainbow',
      subject: 'English',
      grade: 'Grade 5',
      board: 'Santoor',
      chapter: 'Unit 2 · Ch 3',
      length: '3 days',
      summary:
        "Christina Rossetti's poem over three days: meaning, word play, recitation, grammar and colour mixing.",
      about:
        'Day 1 covers the poem and comprehension. Day 2 is word play: anagrams, a spin-wheel, rhyming and a three-voice recitation. Day 3 brings compound words, a journey paragraph, nouns and verbs, and colour mixing.',
      inMyClassroom: '',
      whatIdChange: '',
      driveLink: '',
      files: [
        {
          name: 'Three slide decks',
          link: '',
          order: 1,
        },
        {
          name: 'Three lesson plans',
          link: '',
          order: 2,
        },
        {
          name: 'Notebook-notes handouts with sentence frames',
          link: '',
          order: 3,
        },
        {
          name: 'Answer key for every textbook activity',
          link: '',
          order: 4,
        },
      ],
    },
    {
      id: 'yohannan-community',
      fellowId: 'yohannan',
      title: 'Community',
      subject: 'EVS',
      grade: 'Grade 5',
      board: 'KSEEB',
      chapter: 'Ch 3 · pp. 31–51',
      length: '5 days',
      summary:
        'Rural, urban and tribal communities, a food-chain activity on how we depend on each other, and help during disasters.',
      about:
        'Day 1 covers what makes a community. Days 2 to 4 cover rural, urban and tribal life. Day 5 brings a food-chain activity on interdependence, other kinds of community, and how communities help during natural disasters.',
      inMyClassroom: '',
      whatIdChange:
        'Slides need big text and short, visual phrases. My first decks read like pasted notes.',
      driveLink: '',
      files: [
        {
          name: 'Five lesson plans with a daily Do Now',
          link: '',
          order: 1,
        },
        {
          name: 'Slide decks (timer and voice level on every slide)',
          link: '',
          order: 2,
        },
        {
          name: 'One consolidated set of student notes',
          link: '',
          order: 3,
        },
        {
          name: 'Page-by-page textbook answer key',
          link: '',
          order: 4,
        },
        {
          name: '20-mark unit test',
          link: '',
          order: 5,
        },
      ],
    },
    {
      id: 'yohannan-family',
      fellowId: 'yohannan',
      title: 'Family',
      subject: 'EVS',
      grade: 'Grade 5',
      board: 'KSEEB',
      chapter: 'Ch 2 · pp. 19–30',
      length: '',
      summary:
        'Family trees, relationships, joint and nuclear families, and a neighbourhood household survey.',
      about:
        'Family tree symbols, naming relationships, joint and nuclear families, and how neighbours help each other, ending with a household survey of the neighbourhood.',
      inMyClassroom: '',
      whatIdChange: '',
      driveLink: '',
      files: [
        {
          name: 'Unit plan',
          link: '',
          order: 1,
        },
        {
          name: 'Neighbourhood household survey',
          link: '',
          order: 2,
        },
        {
          name: '20-mark, 45-minute unit test (ends with drawing a family tree)',
          link: '',
          order: 3,
        },
      ],
    },
    {
      id: 'yohannan-food-health',
      fellowId: 'yohannan',
      title: 'Our Food, Our Health',
      subject: 'EVS',
      grade: 'Grade 5',
      board: 'Holiday project',
      chapter: 'Before the nutrition unit',
      length: '10 days',
      summary:
        'A seven-day food diary and a Kitchen Detective task where students read a real nutrition label at home.',
      about:
        'Given before the holiday break so students arrive at the nutrition unit with their own data. They keep a seven-day food diary and choose one task, such as Kitchen Detective, where they read a real nutrition label at home.',
      inMyClassroom: '',
      whatIdChange: '',
      driveLink: '',
      files: [
        {
          name: 'Landscape A4 worksheet (black and white)',
          link: '',
          order: 1,
        },
        {
          name: 'Seven-day food diary',
          link: '',
          order: 2,
        },
        {
          name: 'Choose-one tasks',
          link: '',
          order: 3,
        },
      ],
    },
    {
      id: 'yohannan-the-crew',
      fellowId: 'yohannan',
      title: 'The Crew',
      subject: 'Classroom culture',
      grade: 'Grade 5',
      board: 'Whole class',
      chapter: 'All year',
      length: 'All year',
      summary:
        'Captain and Crew roles, a 0–4 voice-level scale, a daily Do Now, and a restorative path for conflict.',
      about:
        "A shared way of running the room: Captain and Crew roles, a 0–4 voice-level scale, a Do Now on the board every lesson, and a restorative path for conflict: Harbour, What Happened, Back on Deck, Ship's Log. “We are a crew. We sail together, we look after our own, and we make this a room where everyone can think, learn, and feel safe.”",
      inMyClassroom: '',
      whatIdChange:
        'Use the sea theme only where it does real work. Children tire of it when it leaks into every lesson.',
      driveLink: '',
      files: [
        {
          name: 'Roles and vision statement',
          link: '',
          order: 1,
        },
        {
          name: 'Voice-level chart and hand signal cards',
          link: '',
          order: 2,
        },
        {
          name: 'Restorative accountability ladder',
          link: '',
          order: 3,
        },
        {
          name: 'O-soji team cleaning ritual',
          link: '',
          order: 4,
        },
        {
          name: 'Weekly goals wall poster',
          link: '',
          order: 5,
        },
      ],
    },
  ],
};
