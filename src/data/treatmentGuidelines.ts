// Standard Treatment Guidelines for Pharmacy Role
export interface TreatmentGuideline {
  id: string;
  condition: string;
  symptoms: string[];
  firstLine: {
    medication: string;
    dosage: string;
    duration: string;
    notes?: string;
  }[];
  secondLine?: {
    medication: string;
    dosage: string;
    duration: string;
    notes?: string;
  }[];
  precautions: string[];
  whenToRefer: string[];
  patientCounseling: string[];
}

import treatmentData from './treatmentGuidelinesData';
import extraGuidelines from './extraGuidelines';

export const treatmentGuidelines: TreatmentGuideline[] = [
  ...(treatmentData as TreatmentGuideline[]),
  ...extraGuidelines,
];

/* Legacy stub kept for reference:
  {
    id: 'uti-01',
    condition: 'Uncomplicated Urinary Tract Infection (UTI)',
    symptoms: ['Dysuria', 'Frequency', 'Urgency', 'Suprapubic pain'],
    firstLine: [
      {
        medication: 'Nitrofurantoin',
        dosage: '100mg',
        duration: '5 days',
        notes: 'Avoid in G6PD deficiency, renal impairment (eGFR <45)'
      },
      {
        medication: 'Trimethoprim/sulfamethoxazole',
        dosage: '160/800mg',
        duration: '3 days',
        notes: 'If local resistance <20%'
      }
    ],
    secondLine: [
      {
        medication: 'Ciprofloxacin',
        dosage: '250mg',
        duration: '3 days',
        notes: 'Reserve for resistant cases'
      }
    ],
    precautions: [
      'Increase fluid intake',
      'Urinate after intercourse',
      'Avoid spermicides'
    ],
    whenToRefer: [
      'Pregnancy',
      'Male patients',
      'Symptoms >7 days',
      'Recurrent UTIs (≥3/year)'
    ],
    patientCounseling: [
      'Complete full course of antibiotics',
      'Expect symptom improvement in 1-2 days',
      'Return if symptoms worsen or persist'
    ]
  },
  // Add more conditions as needed
  {
    id: 'urti-01',
    condition: 'Upper Respiratory Tract Infection (URTI)',
    symptoms: ['Cough', 'Sore throat', 'Rhinorrhea', 'Fever'],
    firstLine: [
      {
        medication: 'Symptomatic treatment',
        dosage: 'As needed',
        duration: '7-10 days',
        notes: 'Most cases are viral and self-limiting'
      }
    ],
    precautions: [
      'Adequate hydration',
      'Rest',
      'Hand hygiene',
      'Cover mouth when coughing'
    ],
    whenToRefer: [
      'Symptoms >10 days',
      'Severe symptoms',
      'Difficulty breathing',
      'Persistent fever >3 days'
    ],
    patientCounseling: [
      'Antibiotics are not effective for viral infections',
      'Use paracetamol for fever/pain',
      'Consider saline nasal drops for congestion'
    ]
  }
  */

// Helper function to find guidelines by condition, symptoms, or medications
export function findGuidelines(query: string): TreatmentGuideline[] {
  const searchTerm = query.toLowerCase().trim();

  // Tokenize query, remove very common filler words
  const fillerWords = new Set(['for', 'the', 'and', 'with', 'treat', 'treatment', 'manage', 'guideline', 'therapy', 'what', 'how', 'dose', 'dosage', 'protocol', 'first', 'line', 'second', 'drug', 'medication', 'medicine', 'show', 'give', 'can', 'you', 'help', 'please']);
  const tokens = searchTerm
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !fillerWords.has(t));

  // Build a searchable text blob for each guideline (condition + symptoms + all medications)
  const buildSearchText = (g: TreatmentGuideline): string => {
    const parts: string[] = [
      g.condition.toLowerCase(),
      g.symptoms.map(s => s.toLowerCase()).join(' '),
    ];
    // Include medication names from firstLine and secondLine
    for (const fl of g.firstLine) {
      parts.push(fl.medication.toLowerCase());
    }
    if (g.secondLine) {
      for (const sl of g.secondLine) {
        parts.push(sl.medication.toLowerCase());
      }
    }
    // Include counseling and precautions for broader matching
    parts.push(g.patientCounseling.map(c => c.toLowerCase()).join(' '));
    return parts.join(' ');
  };

  // Score each guideline for relevance
  const scored = treatmentGuidelines.map(g => {
    const text = buildSearchText(g);
    let score = 0;

    // Full query exact match in text
    if (text.includes(searchTerm)) score += 10;

    // Token matches
    for (const tok of tokens) {
      if (g.condition.toLowerCase().includes(tok)) score += 5; // condition match is strongest
      else if (g.symptoms.some(s => s.toLowerCase().includes(tok))) score += 3;
      else if (text.includes(tok)) score += 2; // medication or other field match
    }

    return { guideline: g, score };
  });

  // Return all guidelines with score > 0, sorted by relevance
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.guideline);
}

// Helper to list all available conditions (for chatbot suggestions)
export function listAvailableConditions(): string[] {
  return treatmentGuidelines.map(g => g.condition);
}
